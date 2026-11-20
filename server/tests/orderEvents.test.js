const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOrderStatusUpdatePayload,
  canReceiveOrderConfirmed,
  canReceiveOrderStatusUpdate,
} = require('../utils/orderEvents');

test('buildOrderStatusUpdatePayload returns minimal status payload', () => {
  const payload = buildOrderStatusUpdatePayload({
    orderNumber: '12345',
    status: 'Completed',
    paymentStatus: 'Paid',
  });

  assert.deepEqual(payload, {
    orderNumber: '12345',
    status: 'Completed',
    payment_status: 'Paid',
  });
});

test('order status events are limited to owners, assigned attendants, and admins', () => {
  const accessRows = [
    { user_id: 42, created_by: 'attendant-a', assigned_user_id: 7 },
    { user_id: 42, created_by: 'attendant-a', assigned_user_id: 9 },
  ];

  assert.equal(canReceiveOrderStatusUpdate({ roleId: 20, userId: 42 }, accessRows), true);
  assert.equal(canReceiveOrderStatusUpdate({ roleId: 20, userId: 43 }, accessRows), false);
  assert.equal(
    canReceiveOrderStatusUpdate({ roleId: 30, userId: 9, username: 'other' }, accessRows),
    true
  );
  assert.equal(
    canReceiveOrderStatusUpdate({ roleId: 30, userId: 5, username: 'ATTENDANT-A' }, accessRows),
    true
  );
  assert.equal(canReceiveOrderStatusUpdate({ roleId: 10, userId: 1 }, accessRows), true);
  assert.equal(canReceiveOrderStatusUpdate({ roleId: 40, userId: 1 }, accessRows), false);
});

test('order-confirmed events are limited to admins and matching kitchen outlets', () => {
  const payload = { kitchenTypes: ['Kitchen'] };

  assert.equal(canReceiveOrderConfirmed({ roleId: 10 }, payload), true);
  assert.equal(canReceiveOrderConfirmed({ roleId: 40, outletType: 'kitchen' }, payload), true);
  assert.equal(canReceiveOrderConfirmed({ roleId: 40, outletType: 'bar' }, payload), false);
  assert.equal(canReceiveOrderConfirmed({ roleId: 20, outletType: 'kitchen' }, payload), false);
});
