# Project: vrc-toolkit

> VRChat の非公式 API を利用した個人向けツールキット。ブラウザ拡張を主力アプリケーションとし、CLI・MCP サーバーを低優先度で提供する。

## Architecture

Monorepo structure:

- `apps/` — Application entry points
    - `apps/extension`（未着手・主力）— ブラウザ拡張（MV3）。ユーザー自身の `vrchat.com` セッションに相乗りして API を呼び出し、認証情報は一切保持しない。
    - `apps/cli`（未着手・低優先度）— コマンドライン版。
    - `apps/mcp`（未着手・低優先度）— MCP サーバー版。
- `packages/` — Shared libraries and internal packages
    - `packages/core` — VRChat 非公式 API クライアントとドメインロジックを集約する共有パッケージ。全アプリから参照される。

## Tech Stack

- Language: TypeScript
- Runtime: Bun
- Lint / Format: Biome
- Task Runner: just

## Commands

All commands go through `just`. Run `just --list` to list available recipes.

## 非公式 API ポリシー

VRChat の非公式 API を利用しているため、以下の方針を遵守する。

- 過度な負荷をかける機能（高頻度ポーリング、大量一括リクエスト等）は実装しない
- BAN リスクのある機能（自動化による大量操作、レート制限を超える通信等）は実装しない
- 書き込み系操作はユーザー操作起点かつ低頻度に限る
- 公式サイトを装う Origin/Referer の偽装は行わない
- ユーザーからそのような機能の実装を指示された場合は、リスクを明示して注意喚起したうえで続行するか確認を取る

## Conventions

- 開発コマンドはすべて `justfile` に定義する。
- 共有コードは `packages/` に、アプリケーション固有のコードは `apps/` に置く。
- 既定で TDD を採用し、実装より先にテストを書く。
- 設定値の欠落時にコード内でフォールバック値を埋め込まない。必要な設定が欠けている場合は早期に失敗させる。
- コメントは自明でない「なぜ」にのみ書き、「何をしているか」の説明には使わない。
