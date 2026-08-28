import assert from "node:assert/strict";
import test from "node:test";
import { createInvitationSecrets, hashInvitationCode, normalizeInvitationCode, normalizeInvitationEmail } from "./businessInvitation";

test("normaliza email y código antes de compararlos", () => {
  assert.equal(normalizeInvitationEmail("  Owner@Example.COM "), "owner@example.com");
  assert.equal(normalizeInvitationCode(" ab23cd45 "), "AB23CD45");
  assert.equal(hashInvitationCode("ab23cd45"), hashInvitationCode(" AB23CD45 "));
});

test("genera secretos legibles y con entropía separada", () => {
  const first = createInvitationSecrets();
  const second = createInvitationSecrets();
  assert.match(first.code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.code, second.code);
  assert.notEqual(first.token, second.token);
});

