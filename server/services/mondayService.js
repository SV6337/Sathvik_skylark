const axios = require('axios');

const MONDAY_API_URL = 'https://api.monday.com/v2';

async function fetchAndCleanBoard(boardId) {
  // Corrected Monday.com API v2 Query
  const query = `
    query ($board_id: [ID!]) {
      boards (ids: $board_id) {
        name
        columns {
          id
          title
        }
        items_page (limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  const response = await axios.post(
    MONDAY_API_URL,
    { query, variables: { board_id: [String(boardId)] } },
    {
      headers: {
        Authorization: process.env.MONDAY_API_KEY,
        'Content-Type': 'application/json',
        'API-Version': '2024-04',
      },
    }
  );

  if (response.data.errors) {
    throw new Error(`Monday API Error: ${JSON.stringify(response.data.errors)}`);
  }

  const board = response.data.data?.boards[0];
  if (!board) {
    throw new Error(`Board with ID ${boardId} not found.`);
  }

  // Create a map of column ID -> Column Title
  const columnMap = {};
  (board.columns || []).forEach((col) => {
    columnMap[col.id] = col.title;
  });

  const items = board.items_page?.items || [];
  const caveats = [];

  const cleanedData = items.map((item) => {
    const row = { 'Item Name': item.name };

    (item.column_values || []).forEach((col) => {
      const title = columnMap[col.id] || col.id;
      const val = col.text || '';

      // Currency / Number Cleaning
      if (/value|revenue|amount|price|cost|probability/i.test(title)) {
        if (!val) {
          caveats.push(`Field '${title}' had unpopulated values coerced to 0.`);
          row[title] = 0;
        } else {
          const num = parseFloat(val.replace(/[\$,%]/g, '').trim());
          row[title] = isNaN(num) ? 0 : num;
        }
      }
      // Text Cleaning
      else if (/sector|stage|status|industry|owner|client/i.test(title)) {
        row[title] = val.trim() ? val.trim() : 'Unspecified';
      }
      // Date Cleaning
      else if (/date/i.test(title)) {
        if (!val) {
          caveats.push(`Field '${title}' has unpopulated dates.`);
          row[title] = 'N/A';
        } else {
          const parsedDate = new Date(val);
          row[title] = isNaN(parsedDate.getTime()) ? val : parsedDate.toISOString().split('T')[0];
        }
      } else {
        row[title] = val;
      }
    });

    return row;
  });

  return {
    data: cleanedData,
    caveats: [...new Set(caveats)],
  };
}

module.exports = { fetchAndCleanBoard };