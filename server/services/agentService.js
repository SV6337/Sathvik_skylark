const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const { fetchAndCleanBoard } = require('./mondayService');

// Sequential list of free-tier Gemini models to try before falling back to Groq
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

/**
 * Pre-computes exact mathematical aggregations across ALL 346 Deals and 176 Work Orders in Node.js.
 * Reduces context payload to ~800 tokens to ensure fast execution and prevent rate limit errors.
 */
function computeFullDatasetAggregations(deals, orders) {
  let totalPipelineValue = 0;
  const sectorRevenue = {};
  const dealStages = {};
  const dealStatuses = {};
  const orderStatuses = {};

  deals.forEach((deal) => {
    const val = Number(deal['Masked Deal value']) || Number(deal['Deal value']) || Number(deal['Contract Value']) || 0;
    totalPipelineValue += val;

    const sector = deal['Sector/service'] || deal['Sector'] || deal['Industry'] || 'Unspecified';
    sectorRevenue[sector] = (sectorRevenue[sector] || 0) + val;

    const stage = deal['Deal Stage'] || 'Unspecified';
    dealStages[stage] = (dealStages[stage] || 0) + 1;

    const status = deal['Deal Status'] || 'Unspecified';
    dealStatuses[status] = (dealStatuses[status] || 0) + 1;
  });

  orders.forEach((order) => {
    const status = order['Execution Status'] || order['Status'] || 'Unspecified';
    orderStatuses[status] = (orderStatuses[status] || 0) + 1;
  });

  const wonDealsCount = dealStatuses['Won'] || dealStatuses['Closed Won'] || 0;
  const activeWorkOrders = (orderStatuses['In Progress'] || 0) + (orderStatuses['Not Started'] || 0);

  return {
    totalDealsCount: deals.length,
    totalOrdersCount: orders.length,
    totalPipelineValue,
    sectorRevenue,
    dealStages,
    dealStatuses,
    orderStatuses,
    wonDealsCount,
    activeWorkOrders,
  };
}

async function processQuery(userQuery) {
  const dealsBoardId = process.env.DEALS_BOARD_ID;
  const ordersBoardId = process.env.WORK_ORDERS_BOARD_ID;

  // 1. Fetch live Monday.com workspace data
  const [deals, orders] = await Promise.all([
    fetchAndCleanBoard(dealsBoardId),
    fetchAndCleanBoard(ordersBoardId),
  ]);

  const combinedCaveats = [...deals.caveats, ...orders.caveats];
  const stats = computeFullDatasetAggregations(deals.data, orders.data);

  // 2. Refined System Prompt with Flexible Domain Guardrails
  const systemPrompt = `
    You are an elite Business Intelligence AI Agent built exclusively for Skylark Drones.
    Full workspace metrics available:
    - Deals Board: Exactly ${stats.totalDealsCount} total records.
    - Work Orders Board: Exactly ${stats.totalOrdersCount} total records.

    STRICT DOMAIN GUARDRAIL:
    1. You are a business intelligence assistant for Skylark Drones. Answer all legitimate questions regarding sales, pipelines, deals, work orders, business sectors (e.g., Energy, Mining, Infrastructure, Solar, Power, Utilities), operations, bottlenecks, revenue, conversion rates, quarterly targets, and dataset metrics.
    2. ONLY reject queries that are completely off-topic from business analytics (e.g., sports, movies, celebrities, general trivia, weather, cooking, personal queries).
    3. If and ONLY IF the user query is completely off-topic from business analytics, respond EXCLUSIVELY with:
       "I am an executive BI assistant configured exclusively for Skylark Drones workspace analytics. Please ask questions related to Deals, Work Orders, revenue, or operational bottlenecks."

    CRITICAL INSTRUCTIONS FOR CHART GENERATION:
    1. ONLY generate a chart block if the user explicitly asks for a "chart", "graph", "plot", "pie chart", "bar chart", "visual representation", or "visual breakdown".
    2. If the user query is a general text question, summary, executive briefing, count check, sector breakdown, or audit request, DO NOT INCLUDE any CHART block. Respond in clear markdown text only.
    3. IF AND ONLY IF A CHART IS REQUESTED, place the chart JSON at the VERY TOP of your response BEFORE any text response, using this exact syntax:

    ---CHART_START---
    {
      "chartType": "bar", // Options: "bar", "pie", "line"
      "title": "Title of the Visual Chart",
      "xAxisKey": "name",
      "dataKey": "value",
      "data": [
        {"name": "Category A", "value": 150000},
        {"name": "Category B", "value": 90000}
      ]
    }
    ---CHART_END---

    4. Keep all accompanying text analytical, professional, and concise (under 200 words).
  `;

  // 3. User Prompt Payload
  const userPrompt = `
    USER QUERY: "${userQuery}"

    --- FULL WORKSPACE METRICS (Calculated across ALL ${stats.totalDealsCount} Deals & ${stats.totalOrdersCount} Work Orders) ---
    - Total Deals: ${stats.totalDealsCount}
    - Total Work Orders: ${stats.totalOrdersCount}
    - Total Pipeline Value: $${stats.totalPipelineValue.toLocaleString()}
    - Sector Revenue Breakdown ($): ${JSON.stringify(stats.sectorRevenue)}
    - Deal Status Distribution: ${JSON.stringify(stats.dealStatuses)}
    - Deal Stage Breakdown: ${JSON.stringify(stats.dealStages)}
    - Work Order Execution Statuses: ${JSON.stringify(stats.orderStatuses)}
    - Won Deals vs Active Work Orders: ${stats.wonDealsCount} Won / ${stats.activeWorkOrders} Active

    --- KNOWN DATA CAVEATS ---
    ${JSON.stringify(combinedCaveats)}
  `;

  let answerContent = null;

  // STEP 1: Loop through all free-tier Gemini models sequentially
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`🤖 Trying Gemini model: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            maxOutputTokens: 1200,
          },
        });

        if (response && response.text) {
          answerContent = response.text;
          console.log(`✅ Success using Gemini model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ ${modelName} failed (${err.status || err.message}). Trying next available Gemini model...`);
      }
    }
  } else {
    console.warn('⚠️ GEMINI_API_KEY missing in .env, skipping Gemini models.');
  }

  // STEP 2: Fallback to Groq API if all Gemini models fail or exhaust quota
  const groqKey = process.env.GROQ_API_KEY;
  if (!answerContent && groqKey) {
    try {
      console.log('🚀 Falling back to Groq API (llama-3.3-70b-versatile)...');
      const groqClient = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
        maxRetries: 2,
        timeout: 25000,
      });

      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      });

      if (response && response.choices && response.choices[0] && response.choices[0].message.content) {
        answerContent = response.choices[0].message.content;
        console.log('✅ Groq API responded successfully.');
      }
    } catch (err) {
      console.error('❌ Groq API error:', err.message);
    }
  } else if (!answerContent && !groqKey) {
    console.warn('⚠️ GROQ_API_KEY missing in .env');
  }

  if (!answerContent) {
    throw new Error('All available Gemini and Groq models failed or exhausted quota limits.');
  }

  return {
    answer: answerContent,
    caveats: combinedCaveats,
    totalDealsCount: stats.totalDealsCount,
    totalOrdersCount: stats.totalOrdersCount,
  };
}

module.exports = { processQuery };