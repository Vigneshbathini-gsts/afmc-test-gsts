const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const modelPath = path.join("modules", "pubmenubuy", "Pubmenubuymodel.js");
  if (request === "../../config/db" && parent?.filename.endsWith(modelPath)) {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

const { reconcileFreeRowsWithCurrentOffers } = require("../modules/pubmenubuy/Pubmenubuymodel");
Module._load = originalLoad;

test("removes a saved free row when its parent no longer has an active offer", () => {
  const items = [
    {
      order_line_id: 14,
      item_code: 1943,
      price: 10,
      subtotal: 20,
      computed_free_item_quantity: 0,
    },
    {
      order_line_id: 15,
      item_code: 1943,
      barcode: "14",
      type: "Free Item (bogo)",
      price: 0,
      subtotal: 0,
      quantity: 1,
    },
  ];

  assert.deepEqual(reconcileFreeRowsWithCurrentOffers(items), [items[0]]);
});

test("keeps and reconciles a free row when its parent still qualifies", () => {
  const items = [
    {
      order_line_id: 14,
      item_code: 1943,
      price: 10,
      subtotal: 20,
      computed_free_item_quantity: 1,
    },
    {
      order_line_id: 15,
      item_code: 1943,
      barcode: "14",
      price: 0,
      subtotal: 0,
      quantity: 2,
    },
  ];

  assert.equal(reconcileFreeRowsWithCurrentOffers(items)[1].quantity, 1);
});
