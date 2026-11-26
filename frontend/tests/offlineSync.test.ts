import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunk,
  removedCacheKeys,
  isQuotaError,
  toNumericId,
} from "../src/offline/syncUtils.ts";

test("chunk splits arrays into fixed-size batches", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 10), []);
  assert.deepEqual(chunk([1, 2, 3], 0), [[1], [2], [3]]);
});

test("removedCacheKeys finds local ids missing from the server manifest", () => {
  const local = [
    { cacheKey: "e:1", id: 1 },
    { cacheKey: "e:2", id: 2 },
    { cacheKey: "e:3", id: "3" },
  ];
  const serverIds = new Set([1, 3]);
  assert.deepEqual(removedCacheKeys(local, serverIds), ["e:2"]);
});

test("removedCacheKeys keeps everything when server has all ids", () => {
  const local = [
    { cacheKey: "e:1", id: 1 },
    { cacheKey: "e:2", id: 2 },
  ];
  assert.deepEqual(removedCacheKeys(local, new Set([1, 2])), []);
});

test("isQuotaError detects quota/storage failures", () => {
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError(new Error("Storage is full")), true);
  assert.equal(isQuotaError(new Error("Network down")), false);
  assert.equal(isQuotaError(null), false);
});

test("toNumericId normalises ids", () => {
  assert.equal(toNumericId("12"), 12);
  assert.equal(toNumericId(12), 12);
  assert.ok(Number.isNaN(toNumericId("abc")));
});