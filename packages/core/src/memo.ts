import { z } from "zod";

/**
 * 「行動」は 15 分以内に着手できる粒度に分解する。
 * 完璧主義・過集中に陥りがちなユーザー向けに、最初の一歩を小さく固定する。
 */
export const MAX_ACTION_MINUTES = 15;

export const NextActionSchema = z.object({
  text: z.string().min(1).max(200),
  minutes: z.number().int().min(1).max(MAX_ACTION_MINUTES),
  due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});
export type NextAction = z.infer<typeof NextActionSchema>;

export const HorensoKind = z.enum(["報告", "連絡", "相談", "なし"]);
export type HorensoKind = z.infer<typeof HorensoKind>;

export const HorensoSchema = z.object({
  kind: HorensoKind,
  to: z.string().max(100).nullable().default(null),
  /** 相手にそのまま送れる 3 行以内の下書き。 */
  draft: z.string().max(600).nullable().default(null),
});
export type Horenso = z.infer<typeof HorensoSchema>;

/**
 * 語彙力・伝え方の観点。「何と言ったか」→「どう言い換えるか」→「使える語彙」→「次に意識するコツ 1 つ」。
 * 説教にならないよう、コツは 1 つに絞る。
 */
export const VocabularySchema = z.object({
  word: z.string().min(1).max(40),
  /** 意味ではなく「使う場面」を書く。使えないと覚えない。 */
  usage: z.string().min(1).max(120),
});
export type Vocabulary = z.infer<typeof VocabularySchema>;

export const CommunicationSchema = z.object({
  /** ユーザーが実際に言った／書いた表現（入力から分かる場合）。 */
  said: z.string().max(300).nullable().default(null),
  /** 相手に伝わる言い換え。結論 → 理由 → 依頼 の順。 */
  better: z.string().max(400).nullable().default(null),
  /** 今回使える・覚えたい語彙。最大 3 個。 */
  vocabulary: z.array(VocabularySchema).max(3).default([]),
  /** 伝え方のコツ。1 つだけ。 */
  delivery_tip: z.string().max(200).nullable().default(null),
});
export type Communication = z.infer<typeof CommunicationSchema>;

export function emptyCommunication(): Communication {
  return { said: null, better: null, vocabulary: [], delivery_tip: null };
}

export function hasCommunication(c: Communication): boolean {
  return !!(c.said || c.better || c.vocabulary.length || c.delivery_tip);
}

export const MemoSchema = z.object({
  title: z.string().min(1).max(80),
  /** 1〜2 文の要約。事実ベース。 */
  summary: z.string().min(1).max(400),
  /** 誰が・何を・いつ。解釈を混ぜない。 */
  facts: z.array(z.string().min(1).max(300)).max(10),
  /** 良かったこと（Keep）。小さくても拾う。 */
  keep: z.array(z.string().min(1).max(300)).max(5),
  /** 次に試すこと（Try）。 */
  try: z.array(z.string().min(1).max(300)).max(5),
  /** 15 分以内の最初の一歩に分解した行動。 */
  next_actions: z.array(NextActionSchema).max(5),
  /** 関係者。報連相の宛先候補。 */
  people: z.array(z.string().min(1).max(60)).max(10),
  tags: z.array(z.string().min(1).max(30)).max(8),
  horenso: HorensoSchema,
  /** 語彙力・伝え方。旧データには無いので既定値で補う。 */
  communication: CommunicationSchema.default(() => emptyCommunication()),
});
export type Memo = z.infer<typeof MemoSchema>;

/** 空メモ。UI の初期値やテストで使う。 */
export function emptyMemo(): Memo {
  return {
    title: "",
    summary: "",
    facts: [],
    keep: [],
    try: [],
    next_actions: [],
    people: [],
    tags: [],
    horenso: { kind: "なし", to: null, draft: null },
    communication: emptyCommunication(),
  };
}
