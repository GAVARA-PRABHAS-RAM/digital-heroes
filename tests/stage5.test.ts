import { test, describe } from "node:test";
import assert from "node:assert";
import {
  uploadWinnerProofFile,
  getWinnerProofSignedUrl,
  approveWinnerProof,
  rejectWinnerProof,
  markWinnerPayoutPaid,
  getAdminFinancialReport,
  type WinnerWithDetails,
} from "@/services/winners/winnerService";

describe("Stage 5 — Winner Proof Upload & File Validation", () => {
  const dummyBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;

  function createMockSupabase(overrides?: {
    winnerData?: any;
    uploadError?: any;
    insertProofError?: any;
  }) {
    const defaultWinner = {
      id: "w-1",
      user_id: "user-1",
      match_count: 4,
      prize_amount: 350,
      verification_status: "pending",
      payment_status: "pending",
    };

    const winner = overrides?.winnerData !== undefined ? overrides.winnerData : defaultWinner;
    const proofs: any[] = [];
    const winnerUpdates: any[] = [];

    return {
      proofs,
      winnerUpdates,
      client: {
        from: (table: string) => {
          if (table === "winners") {
            return {
              select: (_fields: string) => ({
                eq: (_col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: winner && winner.id === val ? winner : null,
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: (_col: string, val: string) => {
                  winnerUpdates.push({ id: val, patch });
                  if (winner && winner.id === val) {
                    Object.assign(winner, patch);
                  }
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === "winner_proofs") {
            return {
              insert: (payload: any) => ({
                select: () => ({
                  single: async () => {
                    if (overrides?.insertProofError) {
                      return { data: null, error: overrides.insertProofError };
                    }
                    const record = { id: `proof-${proofs.length + 1}`, ...payload, uploaded_at: new Date().toISOString() };
                    proofs.push(record);
                    return { data: record, error: null };
                  },
                }),
              }),
            };
          }
          return {};
        },
        storage: {
          from: (_bucket: string) => ({
            upload: async (_path: string, _buf: any, _opts: any) => {
              if (overrides?.uploadError) {
                return { error: overrides.uploadError };
              }
              return { data: { path: _path }, error: null };
            },
          }),
        },
      } as any,
    };
  }

  test("rejects upload if user is not the owner of the winning entry", async () => {
    const { client } = createMockSupabase({
      winnerData: {
        id: "w-1",
        user_id: "other-user",
        match_count: 4,
        prize_amount: 350,
        verification_status: "pending",
      },
    });

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      dummyBuffer,
      "scorecard.png",
      "image/png",
      client
    );

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("Unauthorized"), "Must return unauthorized error");
  });

  test("rejects upload if match_count is less than 3 (non-winning ticket)", async () => {
    const { client } = createMockSupabase({
      winnerData: {
        id: "w-1",
        user_id: "user-1",
        match_count: 2, // Only 2 matches
        prize_amount: 0,
        verification_status: "pending",
      },
    });

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      dummyBuffer,
      "scorecard.png",
      "image/png",
      client
    );

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("Non-winning tickets"), "Must reject non-winning tickets");
  });

  test("rejects upload if winner verification is already approved", async () => {
    const { client } = createMockSupabase({
      winnerData: {
        id: "w-1",
        user_id: "user-1",
        match_count: 4,
        prize_amount: 350,
        verification_status: "approved",
      },
    });

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      dummyBuffer,
      "scorecard.png",
      "image/png",
      client
    );

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("already been verified"), "Must reject upload for approved winners");
  });

  test("rejects invalid MIME types (e.g. PDF, text, executable)", async () => {
    const { client } = createMockSupabase();

    const invalidTypes = ["application/pdf", "text/plain", "image/gif", "application/zip"];
    for (const mime of invalidTypes) {
      const res = await uploadWinnerProofFile(
        "user-1",
        "w-1",
        dummyBuffer,
        "scorecard.pdf",
        mime,
        client
      );
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes("Invalid file type"));
    }
  });

  test("accepts valid image MIME types: image/png, image/jpeg, image/jpg, image/webp", async () => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    for (const mime of validTypes) {
      const { client } = createMockSupabase();
      const res = await uploadWinnerProofFile(
        "user-1",
        "w-1",
        dummyBuffer,
        "scorecard.img",
        mime,
        client
      );
      assert.strictEqual(res.success, true, `MIME type ${mime} should be accepted`);
    }
  });

  test("rejects file exceeding 5MB size limit", async () => {
    const { client } = createMockSupabase();
    const oversizedBuffer = new ArrayBuffer(5 * 1024 * 1024 + 1); // 5MB + 1 byte

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      oversizedBuffer,
      "huge_scorecard.png",
      "image/png",
      client
    );

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("exceeds maximum size limit"), "Must enforce 5MB limit");
  });

  test("successfully uploads valid proof, creates proof record, and updates winner status", async () => {
    const { client, proofs, winnerUpdates } = createMockSupabase();

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      dummyBuffer,
      "valid_scorecard.png",
      "image/png",
      client
    );

    assert.strictEqual(res.success, true);
    assert.ok(res.proof);
    assert.strictEqual(proofs.length, 1);
    assert.strictEqual(proofs[0].winner_id, "w-1");
    assert.strictEqual(proofs[0].status, "pending");
    assert.ok(winnerUpdates.some((u) => u.patch.verification_status === "pending"));
  });
});

describe("Stage 5 — Audit History & Replacement Proofs", () => {
  const dummyBuffer = new Uint8Array([1, 2, 3]).buffer;

  test("uploading replacement proof creates a NEW proof record and does NOT delete previous rejected proof", async () => {
    // Initial state: winner was rejected with proof-1
    const storedProofs: any[] = [
      {
        id: "proof-1",
        winner_id: "w-1",
        file_url: "user-1/w-1/old.png",
        status: "rejected",
        review_notes: "Image is blurry",
        uploaded_at: "2026-09-21T09:00:00Z",
      },
    ];

    const winner = {
      id: "w-1",
      user_id: "user-1",
      match_count: 5,
      prize_amount: 1000,
      verification_status: "rejected",
    };

    const mockClient = {
      from: (table: string) => {
        if (table === "winners") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: winner, error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(winner, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "winner_proofs") {
          return {
            insert: (payload: any) => ({
              select: () => ({
                single: async () => {
                  const newProof = {
                    id: `proof-${storedProofs.length + 1}`,
                    ...payload,
                    uploaded_at: new Date().toISOString(),
                  };
                  storedProofs.push(newProof);
                  return { data: newProof, error: null };
                },
              }),
            }),
          };
        }
        return {};
      },
      storage: {
        from: () => ({
          upload: async () => ({ data: { path: "new-path.png" }, error: null }),
        }),
      },
    } as any;

    const res = await uploadWinnerProofFile(
      "user-1",
      "w-1",
      dummyBuffer,
      "replacement.png",
      "image/png",
      mockClient
    );

    assert.strictEqual(res.success, true);
    // Audit History preserved: both proofs exist!
    assert.strictEqual(storedProofs.length, 2);
    assert.strictEqual(storedProofs[0].id, "proof-1");
    assert.strictEqual(storedProofs[0].status, "rejected");
    assert.strictEqual(storedProofs[0].review_notes, "Image is blurry");
    assert.strictEqual(storedProofs[1].id, "proof-2");
    assert.strictEqual(storedProofs[1].status, "pending");

    // Winner verification status reset to pending for review
    assert.strictEqual(winner.verification_status, "pending");
  });
});

describe("Stage 5 — Ephemeral Signed URLs & Authorization", () => {
  function createSignedUrlMock(ownerId: string, proofWinnerId: string) {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "proof-1",
                file_url: `${ownerId}/w-1/doc.png`,
                winner: { id: "w-1", user_id: proofWinnerId },
              },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (path: string, expiresIn: number) => {
            assert.strictEqual(bucket, "winner-proofs");
            assert.strictEqual(expiresIn, 3600); // 1 hour expiration
            return {
              data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=exp1h` },
              error: null,
            };
          },
        }),
      },
    } as any;
  }

  test("owner subscriber can generate signed preview URL", async () => {
    const client = createSignedUrlMock("user-1", "user-1");
    const res = await getWinnerProofSignedUrl("user-1", "proof-1", false, client);

    assert.strictEqual(res.success, true);
    assert.ok(res.signedUrl?.includes("token=exp1h"));
  });

  test("admin can generate signed preview URL for any winner", async () => {
    const client = createSignedUrlMock("user-1", "user-1");
    const res = await getWinnerProofSignedUrl("admin-99", "proof-1", true, client);

    assert.strictEqual(res.success, true);
    assert.ok(res.signedUrl?.includes("token=exp1h"));
  });

  test("non-owner non-admin is strictly denied access to signed URL", async () => {
    const client = createSignedUrlMock("user-1", "user-1");
    const res = await getWinnerProofSignedUrl("unauthorized-user", "proof-1", false, client);

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("Unauthorized"));
  });
});

describe("Stage 5 — Admin Review Workflow (Approval & Rejection)", () => {
  test("admin approval updates proof, winner verification_status, and creates pending payout", async () => {
    const winner = {
      id: "w-1",
      prize_amount: 350,
      verification_status: "pending",
      payment_status: "pending",
    };
    const proof = { id: "p-1", winner_id: "w-1", status: "pending" };
    let createdPayout: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === "winners") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: winner, error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(winner, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "winner_proofs") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [proof], error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(proof, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "payouts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }), // No payout yet
              }),
            }),
            insert: async (payoutPayload: any) => {
              createdPayout = payoutPayload;
              return { data: payoutPayload, error: null };
            },
          };
        }
        return {};
      },
    } as any;

    const res = await approveWinnerProof("admin-1", "w-1", "p-1", mockClient);

    assert.strictEqual(res.success, true);
    assert.strictEqual(proof.status, "approved");
    assert.strictEqual(winner.verification_status, "approved");
    assert.ok(createdPayout);
    assert.strictEqual(createdPayout.winner_id, "w-1");
    assert.strictEqual(createdPayout.amount, 350);
    assert.strictEqual(createdPayout.status, "pending");
  });

  test("admin rejection requires a non-empty reason and updates review notes", async () => {
    const winner = { id: "w-1", verification_status: "pending" };
    const proof = { id: "p-1", winner_id: "w-1", status: "pending", review_notes: null };

    const mockClient = {
      from: (table: string) => {
        if (table === "winners") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: winner, error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(winner, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "winner_proofs") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [proof], error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(proof, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      },
    } as any;

    // 1. Empty reason fails
    const emptyRes = await rejectWinnerProof("admin-1", "w-1", "   ", "p-1", mockClient);
    assert.strictEqual(emptyRes.success, false);
    assert.ok(emptyRes.error?.includes("rejection reason is required"));

    // 2. Valid reason succeeds
    const validRes = await rejectWinnerProof(
      "admin-1",
      "w-1",
      "Scorecard signature missing",
      "p-1",
      mockClient
    );
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(proof.status, "rejected");
    assert.strictEqual(proof.review_notes, "Scorecard signature missing");
    assert.strictEqual(winner.verification_status, "rejected");
  });
});

describe("Stage 5 — Strict Payout Invariant & Gating", () => {
  test("strictly blocks payout if winner verification_status is not approved", async () => {
    const invalidStatuses = ["pending", "rejected", "unverified"];

    for (const status of invalidStatuses) {
      const winner = {
        id: "w-1",
        prize_amount: 500,
        verification_status: status,
        payment_status: "pending",
      };

      const mockClient = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: winner, error: null }),
            }),
          }),
        }),
      } as any;

      const res = await markWinnerPayoutPaid("admin-1", "w-1", mockClient);
      assert.strictEqual(res.success, false);
      assert.ok(
        res.error?.includes("Winner must be approved before payout"),
        `Must block payout for status: ${status}`
      );
    }
  });

  test("strictly blocks payout if already marked paid", async () => {
    const winner = {
      id: "w-1",
      prize_amount: 500,
      verification_status: "approved",
      payment_status: "paid", // Already paid
    };

    const mockClient = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: winner, error: null }),
          }),
        }),
      }),
    } as any;

    const res = await markWinnerPayoutPaid("admin-1", "w-1", mockClient);
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("already been marked as Paid"));
  });

  test("approved winner is successfully transitioned to Paid with paid_at timestamp", async () => {
    const winner = {
      id: "w-1",
      prize_amount: 500,
      verification_status: "approved",
      payment_status: "pending",
    };
    const payout = { id: "pay-1", winner_id: "w-1", status: "pending", paid_at: null };

    const mockClient = {
      from: (table: string) => {
        if (table === "winners") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: winner, error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(winner, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "payouts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: payout, error: null }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => {
                Object.assign(payout, patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      },
    } as any;

    const res = await markWinnerPayoutPaid("admin-1", "w-1", mockClient);

    assert.strictEqual(res.success, true);
    assert.ok(res.paidAt);
    assert.strictEqual(winner.payment_status, "paid");
    assert.strictEqual(payout.status, "paid");
    assert.strictEqual(payout.paid_at, res.paidAt);
  });
});

describe("Stage 5 — Financial Reports & Reconciliation Aggregation", () => {
  test("accurately aggregates subscriber count, prize pool, proofs breakdown, and payout queue", async () => {
    const mockWinners = [
      {
        id: "w-1",
        prize_amount: 350,
        match_count: 4,
        verification_status: "approved",
        payment_status: "paid",
        profile: { full_name: "Alice", email: "alice@test.com" },
        draw: { draw_number: "DH-DRAW-1" },
        winner_proofs: [{ id: "pr-1", status: "approved", uploaded_at: "2026-09-20" }],
        payouts: [{ id: "pay-1", status: "paid", paid_at: "2026-09-21" }],
      },
      {
        id: "w-2",
        prize_amount: 150,
        match_count: 3,
        verification_status: "approved",
        payment_status: "pending",
        profile: { full_name: "Bob", email: "bob@test.com" },
        draw: { draw_number: "DH-DRAW-1" },
        winner_proofs: [{ id: "pr-2", status: "approved", uploaded_at: "2026-09-20" }],
        payouts: [{ id: "pay-2", status: "pending", paid_at: null }],
      },
      {
        id: "w-3",
        prize_amount: 1000,
        match_count: 5,
        verification_status: "rejected",
        payment_status: "pending",
        profile: { full_name: "Charlie", email: "charlie@test.com" },
        draw: { draw_number: "DH-DRAW-1" },
        winner_proofs: [{ id: "pr-3", status: "rejected", uploaded_at: "2026-09-19" }],
        payouts: [],
      },
    ];

    const mockProofs = [
      { id: "pr-1", status: "approved" },
      { id: "pr-2", status: "approved" },
      { id: "pr-3", status: "rejected" },
      { id: "pr-4", status: "pending" },
    ];

    const mockClient = {
      from: (table: string) => {
        if (table === "subscriptions") {
          return {
            select: () => ({
              eq: async () => ({ count: 12, error: null }),
            }),
          };
        }
        if (table === "prizes") {
          return {
            select: async () => ({
              data: [{ pool_amount: 1000 }, { pool_amount: 500 }],
              error: null,
            }),
          };
        }
        if (table === "winners") {
          return {
            select: () => ({
              order: async () => ({ data: mockWinners, error: null }),
            }),
          };
        }
        if (table === "winner_proofs") {
          return {
            select: async () => ({ data: mockProofs, error: null }),
          };
        }
        return {};
      },
    } as any;

    const report = await getAdminFinancialReport(mockClient);

    assert.strictEqual(report.totalSubscribers, 12);
    assert.strictEqual(report.totalPrizePool, 1500);
    assert.strictEqual(report.totalWinnings, 1500); // 350 + 150 + 1000

    // Proofs
    assert.strictEqual(report.proofs.total, 4);
    assert.strictEqual(report.proofs.approved, 2);
    assert.strictEqual(report.proofs.rejected, 1);
    assert.strictEqual(report.proofs.pending, 1);

    // Payouts
    assert.strictEqual(report.payouts.paidCount, 1);
    assert.strictEqual(report.payouts.paidAmount, 350);
    assert.strictEqual(report.payouts.pendingCount, 1);
    assert.strictEqual(report.payouts.pendingAmount, 150);
    assert.strictEqual(report.payouts.totalAmount, 500);

    // Payout list (only approved winners qualify for payout reconciliation)
    assert.strictEqual(report.payoutList.length, 2);
  });
});
