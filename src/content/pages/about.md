---
title: 關於 CCChange
description: CCChange 是一份由 Claude Code 自動出刊的每日 changelog 講義。
updated: 2026-08-02
---

CCChange 追蹤 [Claude Code](https://github.com/anthropics/claude-code) 的 CHANGELOG，每天出一則中文講義。

每則講義固定回答四件事：

1. **24 小時內有沒有新版？** 有就拆，沒有就明說沒有 —— 「今天沒有更新」也是一則有效的情報。
2. **新功能的精神是什麼？** 不複述 changelog，而是問「這個設計在解決哪一類問題」。
3. **社群怎麼說？** 引第三方評測與討論，包含不好聽的那些。
4. **誠實的判決。** 這個功能對你今天的工作流到底有沒有用，沒用就說沒用。

所有版本時間、行為驗證都在撰稿時實際執行過，並在文中標註來源是官方文件、社群評測，還是本機實測。

---

## 這個站怎麼運作

整條流水線是自動的，每天 **08:00（Asia/Taipei）** 出刊：

- Claude Code 依排程讀取 upstream CHANGELOG，比對版本時間
- 產出講義草稿，開一支 `daily/YYYY-MM-DD` 分支並發 Pull Request
- GitHub Actions 跑 CI（frontmatter 檢查、Astro build、連結檢查）
- CI 全綠且 PR 由授權作者送出時，workflow 自動合併
- 合併進 `main` 後自動部署到 GitHub Pages

版面使用 [Lipi](https://github.com/thelocalhoststudio/lipi)，一個 typography-first 的 Astro 模板，由 The Localhost Studio 製作。
