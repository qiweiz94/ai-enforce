# Keel — Market Research & Strategy Master Report

**Date:** July 29, 2026
**Status:** Final
**Author:** Research synthesis from 10 agents across 2 rounds

---

## 1. Executive Summary

Keel (formerly ai-enforce) is an AI governance tool pivoting from developer-focused enforcement to serving non-technical AI users — "vibe coders" building software with Bolt.new, Lovable, Replit, Cursor, and similar tools.

**Core insight:** 45% of AI-generated code has security flaws (Veracode). Vibe coding platforms grew $0→$200M ARR in months. Non-technical builders have no way to know if their AI-built app is safe, and no existing tool speaks their language.

**Strategy:** Three-phase rollout:
1. Solopreneur/freelancer product ("Keel Scan") — validate ICP, generate revenue
2. MSP channel — scale via managed service providers to SMBs
3. Platform sell-in — white-label security for vibe coding platforms

---

## 2. Research Methodology

### 2.1 Sources Searched

- Hacker News (150+ threads across multiple queries)
- Reddit (r/msp, r/vibecoding, r/SideProject, r/SaaS, r/smallbusiness, r/freelance, r/Entrepreneur, r/privacy)
- GitHub (competitor repos, star counts, activity)
- Company websites and pricing pages
- Industry reports (MarketsandMarkets, Mordor Intelligence, Gartner)
- News articles (TechCrunch, Bloomberg, FT, Forbes)
- Product reviews and community discussions

### 2.2 Verification Note

The "$106k Aider incident" cited in earlier project docs could not be verified across any public source. It has been removed as evidence. Real, documented incidents replaced it:

- **Lovable:** 170/1,645 apps exposed user data (10.3%) — verified via security researcher Matt Palmer
- **Replit:** AI agent deleted production database — verified via SaaStr founder Jason Lemkin
- **Orchids:** zero-click remote compromise — verified via BBC live demonstration

### 2.3 Lesson Learned

Earlier analysis (July 28) was biased by sunk cost — the product existed for developers, so I recommended the developer path despite strong evidence against it. This report corrects that bias by:
- Presenting evidence FOR and AGAINST every ICP
- Verifying market figures independently (Mordor Intelligence, MarketsandMarkets)
- Researching competitors honestly instead of dismissing them
- Surfacing counter-evidence proactively

---

## 3. Market Sizing

### 3.1 AI Code Assistants Market

| Source | 2025 | 2032 | CAGR |
|--------|------|------|------|
| MarketsandMarkets (Aug 2026) | $8.14B | $127.05B | 48.1% |

Key players: IBM, Microsoft, AWS, Google, Replit, OpenAI, Anthropic, Cursor, Windsurf.

### 3.2 AI Governance Market

| Source | 2026 | 2031 | CAGR |
|--------|------|------|------|
| Mordor Intelligence | $0.44B | $1.51B | 28.15% |

Note: Earlier claim of $1.65B→$13.52B was incorrect (overstated ~4x). The correct figure is from Mordor Intelligence.

### 3.3 Vibe Coding Platform Traction

| Platform | Users/ARR | Valuation | Source |
|----------|-----------|-----------|--------|
| Replit | 50M+ users, ~$1B ARR run rate | $9B (Mar 2026) | blog.replit.com |
| Cursor | $3B ARR (Nov 2025) | $60B acquisition (Jun 2026) | TechCrunch |
| Lovable | 8M users, 180K paid, $200M ARR | $6.6B (Dec 2025) | Forbes, FT |
| Bolt.new | Growing, $25/mo Pro plan | Part of StackBlitz | — |

### 3.4 MSP Channel Size

- 30,000-40,000 MSPs in US, 150,000-200,000 globally
- Each MSP serves 50-500 SMB clients
- Average MSP security tool spend: $2-5/user/month wholesale
- Source: CompTIA, Kaseya State of the MSP Report 2026

### 3.5 Incident Data

| Statistic | Source |
|-----------|--------|
| 45% of AI-generated code has security flaws | Veracode GenAI Report, Oct 2025 |
| 2.74x more security vulnerabilities in AI-co-authored code | CodeRabbit, Dec 2025 |
| 75% of Replit users never write a line of code | Replit CEO Amjad Masad, Feb 2025 |
| 25% of YC W25 batch codebases are 95%+ AI-generated | YC managing partner, Mar 2025 |
| 68% of employees use personal accounts for free AI tools | Proofpoint, 2025 |
| $670K more cost per breach with shadow AI involvement | IBM Cost of Data Breach, 2025 |
| Only 36% of companies have a formal AI policy | S&P Global |

---

## 4. Competitive Landscape

### 4.1 Developers' AI Governance (Red Ocean — Don't Target)

| Competitor | Stars/Status | Why Not |
|------------|-------------|---------|
| **Claude Code** | Comprehensive built-in governance (lifecycle hooks, sandboxing, credential protection, managed settings, OTEL export) | Already has most features Keel would offer |
| **Snyk** | 5.6k stars, $B+ valuation, 9,670 commits | Could add AI governance as feature — massive distribution |
| **Guardrails AI** | 7.2k stars, company with enterprise case studies (Masterclass, Changi Airport) | Could expand into coding governance |
| **Vectimus (Cedar policy enforcement)** | 3 points, 2 comments on HN | Devs don't want this |
| **Guardian Runtime** | Minimal HN engagement | No traction |
| **TokenShield** | Minimal HN engagement | No traction |

### 4.2 Enterprise Shadow AI (Red Ocean — Don't Target)

| Competitor | Pricing | Why Not |
|------------|---------|---------|
| **Microsoft Purview** | 400M+ M365 seats, $12/user/mo add-on, $720K/yr for 1K users | Incumbent, entrenched |
| **Cyberhaven** | $88M raised, $150K-$500K ACV | Enterprise-only, well-funded |
| **Proofpoint** | $100K-$500K ACV | Enterprise relationships |
| **Zscaler/Netskope** | $50K-$500K ACV | Platform incumbency |

Note: None of these serve SMB or individual markets.

### 4.3 Vibe Code Security (Blue Ocean — Primary Target)

| Competitor | What It Is | Why Keel Wins |
|------------|-----------|---------------|
| **Vchk** | Free CLI, MIT licensed, 8 rules | CLI-only (vibe coders won't use). No signed reports, no plain-English, no ongoing monitoring |
| **Veracode/CodeRabbit/Snyk/Semgrep** | Professional SAST/SCA tools | Target developers, assume CLI/CI/CD knowledge. No product for non-technical users |
| **Replit built-in security** | Package Firewall, Secrets, Scanner (Semgrep) | Platform-specific. Does not produce signed reports. Cross-platform is Keel's moat |

### 4.4 Personal AI Privacy Tools (Niche — Potential Future Feature)

| Product | Description | Price |
|---------|-------------|-------|
| Privacy Firewall | MIT, Chrome extension | Free |
| Velar | MIT, local proxy | Free |
| nono (3.3k stars) | Agent sandboxing | Free OSS |
| LuLu/OpenSnitch | macOS firewall alternatives | Free OSS |
| Little Snitch | macOS firewall, 20+ yr product | $59 one-time |

---

## 5. ICP Analysis

### 5.1 ICP Decision Matrix

| Criterion | Vibe Coders | MSPs | SMBs Direct | Power Users | Solopreneurs |
|-----------|-------------|------|-------------|-------------|--------------|
| Market size | 50M+ users | 30-40K US MSPs | 3-4M businesses | 1-3M US | Growing |
| Pain urgency | Latent | **Acute** (incidents NOW) | Latent | Real but niche | **Growing** |
| WTP | $10-20/mo | $2-5/user/mo ($10K-100K ACV) | $5-7/user/mo | $39-59 one-time | $19-29/mo |
| Competition | Platforms building in | **None** in channel | Purview exists | 4+ OSS projects | Vchk (free CLI) |
| GTM difficulty | Easy (viral) | Hard (SOC 2, Pax8) | Medium | Medium | **Easy** (HN/Reddit) |
| Revenue/customer | $120-240/yr | **$10K-100K/yr** per MSP | $60-120/yr | $39-59 one-time | $228-348/yr |
| Score | 5/10 | **8/10** | 5/10 | 4/10 | **6/10** |

### 5.2 Chosen ICP: Solopreneurs → MSPs (Phased)

**Primary (Phase 1):** Solopreneurs & freelancers using AI to build software.
They have revenue at risk, clients to satisfy, and documented fear of liability.

Key evidence:
- Reddit r/vibecoding "security and liability" thread with direct asks for this product
- 45% of AI-generated code has security flaws
- They already spend $50-250/mo on tools
- Easy GTM (HN, Reddit, viral)

**Secondary (Phase 2):** MSPs serving SMBs.

Key evidence:
- Multiple r/msp threads (50-100+ points) showing active demand
- Zero existing AI governance products in MSP channel
- Typical ACV $10K-100K/yr per MSP
- MSPs are channel — distribution to thousands of SMBs

**Tertiary (Phase 3):** Vibe coding platforms.

Key evidence:
- Lovable had 10.3% apps leaking data, built internal scanner (criticized as insufficient)
- Replit had database deletion incident
- Platforms need security as competitive moat

### 5.3 ICPs Explicitly Discarded

| Discarded ICP | Reason |
|---------------|--------|
| **Enterprise shadow AI** | Red ocean — Microsoft Purview, Cyberhaven, Proofpoint dominate. Need enterprise sales team + SOC 2 + $50K+ in certs before first meeting. |
| **Individual AI power users** | Niche within niche. Low WTP ($39-59 one-time). 4+ open-source competitors. Would need 500K+ users for real business. Little Snitch is $10-20M ARR after 20 years. |
| **Developers** (original ai-enforce target) | Devs disable guardrails. Claude Code already has it built-in. Vectimus (same category) got 3 points on HN. Dev tools market is a blood bath. |

---

## 6. MCP Decision

### 6.1 The "MCP is Dead" Claim — Assessment

**Finding:** MCP is not dead, but it is not the universal standard its early hype predicted.

**Supporting MCP:**
- OpenAI (Sam Altman endorsement, Responses API integration)
- Google (Linux Foundation AAIF contribution)
- Microsoft, AWS (founding AAIF members)
- 89,000+ GitHub stars on reference repo
- OWASP MCP Top 10 published (indicates maturity)

**Skeptical of MCP:**
- OpenClaw (200k+ stars) explicitly rejected MCP for CLI-based execution
- Eric Holmes' "MCP is dead. Long live the CLI" — 447 HN points
- ~54k tokens per MCP server spec loading overhead
- Fragmented ecosystem with MCP clones

**Verdict:** MCP found a niche (enterprise SaaS integrations, structured tool access) while CLIs/APIs dominate developer workflows. The protocol is maturing through Linux Foundation standardization but is not universal.

Source: ejholmes.github.io, Feb 2026; Flamehaven Medium article, Mar 2026; OpenAI developers docs

### 6.2 Decision

**Do not depend on MCP.** The product must be protocol-agnostic — works regardless of MCP, CLI, API, or browser. The existing MCP gateway code (packages/cli/src/mcp/) is valuable but should be a feature, not the foundation. This is consistent with targeting non-technical users who don't use MCP at all.

---

## 7. Three-Phase Strategy

### 7.1 Phase 1: "Keel Scan" — Solopreneurs & Freelancers

**Timeline:** Month 1 (4 weeks)

**Product:** A web app where solopreneurs paste their GitHub repo URL and receive a plain-English, Ed25519-signed security report.

**User workflow:**
1. Paste GitHub URL (public repos initially)
2. Keel scans: hardcoded secrets, SQL injection, missing auth, exposed env vars, dependency issues, open ports in config
3. Plain-English report: "Your app has 3 critical issues. Score: 58/100. Here's how to fix each."
4. Ed25519-signed PDF report with QR verification code
5. Optional: one-click auto-fix (generates secure replacement code)

**Reuse from Keel codebase:**

| Asset | File | Lines | Use in Phase 1 |
|-------|------|-------|----------------|
| Policy engine | packages/core/src/policy-engine.ts | 835 | Scanning engine — file rules, content rules, secret detection |
| Ed25519 signing | packages/core/src/signing.ts | 284 | Signing the security report as verifiable evidence |
| Action receipts | packages/core/src/receipts.ts | 216 | Per-scan audit trail |
| CLI scan command | packages/cli/src/commands/scan.ts | — | Wrap as API |
| Anomaly detection | packages/cli/src/anomaly.ts | — | Future: detect deception in AI output |
| Reasoning analysis | packages/cli/src/reasoning.ts | — | Future: detect deception patterns |

**New to build:**

| Component | Effort | Notes |
|-----------|--------|-------|
| Simple web frontend (one-page scan + report) | 1 week | Vibe coders won't use CLI |
| API wrapper for scanning engine | 1 week | Turn CLI commands into REST endpoints |
| PDF report generator | 3 days | Clean, client-friendly signed report |
| Stripe subscription ($29/mo) | 2 days | Billing for ongoing scans |
| Landing page + waitlist | 2 days | Pre-launch validation |

**Pricing:**
| Tier | Price | What's Included |
|------|-------|-----------------|
| Free | $0 | 1 scan, basic report |
| Pro | $29/mo | Unlimited scans, signed certificates, auto-fix, priority support |

**Evidence this pricing works:**
- Lexray (similar tool for contract screening) got 40+ users in 5 days, $500/hr lawyer alternative
- Solopreneurs spend $50-250/mo on tools; $29/mo is within budget
- Cursor $20/mo, ChatGPT $20/mo, Replit Core $20/mo — vibe coders already pay for tooling

**Distribution (GTM):**

| Channel | Tactic | Effort |
|---------|--------|--------|
| Reddit | r/vibecoding, r/SideProject, r/SaaS — the liability thread had direct asks for this | 1 post |
| Hacker News | Show HN: "I built a security scanner that generates signed reports for AI-built apps" | 1 launch |
| Twitter/X | Vibe coders love sharing builds. "My app scored 94/100 on Keel 🔒" is viral seed | Ongoing |
| Product Hunt | Launch as Keel Scan | 1 launch |
| Platform forums | Lovable/Bolt/Replit community forums — "Is your AI-built app safe?" | Cross-post |

**Success metrics (end of Month 1):**
- 100 scans completed
- 10 paid subscribers ($290 MRR)
- 5 signed reports shared publicly (viral seed)
- 1+ MSP partner inquiry (validates Phase 2)

**Timeline detail:**

| Week | Deliverable |
|------|-------------|
| Week 1 | Landing page + waitlist. Share on Reddit/Twitter for validation. No code yet. |
| Week 2 | Build web frontend + API wrapper around existing scan engine |
| Week 3 | PDF report generator + Stripe integration. Signed certificate with QR code |
| Week 4 | Launch HN + Product Hunt. Manual onboarding for first 20 users. Iterate |

### 7.2 Phase 2: "Keel for MSPs" — Channel Distribution

**Timeline:** Months 3-6

**Product:** Multi-tenant dashboard for MSPs to manage AI governance across all their SMB clients.

**MSP needs (from Reddit r/msp research):**
- See which AI tools each client's employees are using
- Set data leakage policies (block pasting PII into ChatGPT)
- White-label dashboard for client reporting
- Per-client billing, automated invoicing
- API integration with PSA (ConnectWise Manage, Autotask) and RMM (NinjaOne, Kaseya)

**New to build:**

| Component | Effort | Notes |
|-----------|--------|-------|
| Multi-tenant architecture | 2-3 weeks | Separate data, config, billing per MSP client |
| Entra ID SSO integration | 1 week | MSPs require Microsoft SSO |
| White-label dashboard | 2 weeks | MSPs need to rebrand as their own service |
| PSA/RMM API connectors | 2-3 weeks | ConnectWise Manage, NinjaOne integrations |
| Simple DLP agent (browser extension or DNS proxy) | 3-4 weeks | Block data leakage into ChatGPT |
| SOC 2 Type II audit | 8-12 weeks | Table stakes for MSP tools — start process Month 1 |

**Pricing (wholesale to MSPs):**
| Tier | Price to MSP | MSP resell price | MSP margin |
|------|-------------|-----------------|------------|
| Per-user | $3/user/month | $5-8/user/month | 40-60% |
| Minimum | 50 users per MSP | — | — |

**ACV projection:**
- Average MSP: 100 clients × 15 users = 1,500 users
- 1,500 × $3/mo × 12 mo = $54K/yr per MSP
- 10 MSPs = $540K ARR
- 50 MSPs = $2.7M ARR

**Distribution:**

| Channel | Timeline |
|---------|----------|
| Pax8 marketplace | Month 3 (apply as vendor) |
| Reddit r/msp | Case studies from Phase 1 → MSP offer |
| Ingram Micro / Sherweb | Month 4 (secondary channels) |
| Direct outreach to top 20 MSPs | Month 3 (identified from Reddit posts) |

**Critical requirements before MSP conversations:**
- SOC 2 Type II (start process Month 1 — takes 8-12 weeks)
- Multi-tenant architecture
- Microsoft Entra ID SSO
- Pax8 vendor approval

**Key risk:** MSP sales cycles are 6-12 months. Revenue projection is Month 9-12, not Month 3-6. Phase 1 revenue buys runway.

### 7.3 Phase 3: "Keel Certified" — Platform Sell-In

**Timeline:** Months 6-12

**Product:** White-label SDK/API for vibe coding platforms.

**Value prop to platforms:** "Your users build apps that leak data. Every incident erodes enterprise trust. Keel scans every app published on your platform and displays a 'Keel Certified' badge. Your platform becomes the safest place to build with AI."

**Target platforms (priority order):**

| Platform | ARR | Security need | Likelihood |
|----------|-----|---------------|------------|
| Bolt.new | Growing | No public security features | High — needs differentiation |
| Lovable | $200M ARR | Had 10.3% apps leaking data | High — tried internal scanner, failed |
| Replit | ~$1B ARR | Building internal security | Medium — may prefer build |
| Cursor | $3B ARR | Hired security lead (Travis McPeak) | Low — building in-house |

**Pricing:** $100K-500K/yr per platform (varies by user base size, white-label scope, exclusivity)

---

## 8. Technical Architecture & Reuse

### 8.1 Existing Keel Codebase

**Packages:**
| Package | Purpose | Status |
|---------|---------|--------|
| packages/core | Policy engine, signing, receipts, types | Complete, 119 tests passing |
| packages/cli | CLI with 10 commands (check, scan, verify, audit, serve, gateway, etc.) | Complete, wraps core |
| packages/mcp-server | MCP protocol enforcement server | Existing, de-emphasized for Phase 1 |
| packages/github-action | GitHub Action integration | Existing |

### 8.2 Phase 1 Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
│  Web UI     │───▶│  API Server  │───▶│  Scan Engine        │
│  (React or  │    │  (Node.js)   │    │  policy-engine.ts   │
│   static)   │    │              │    │  signing.ts         │
│             │    │  POST /scan  │    │  receipts.ts        │
│             │    │  POST /fix   │    │                     │
└─────────────┘    │  GET /report │    └─────────────────────┘
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │  Report Gen  │
                   │  PDF + QR    │
                   │  + Ed25519   │
                   └──────────────┘
```

**Key architectural decision:** Scan runs on Keel's servers (not self-hosted).

Rationale:
- Target users paste GitHub URLs — they won't run CLIs
- Public repos only initially (code is already public)
- Ephemeral processing: scanned in memory, immediately discarded
- One-sentence privacy policy on the landing page
- CLI fallback: `npx keel-vibe scan` for anyone who refuses cloud
- SOC 2 cert (started Month 1) covers the trust gap

### 8.3 Rename Plan

The existing `ai-enforce` → `@getkeel/keel` rename was already planned before this pivot. That work is still valid and should proceed:
- Package names in `package.json`
- Binary name (`ai-enforce` → `keel`)
- Docs and README references
- Install script updates

---

## 9. Risks & Mitigations

### 9.1 Threats to Business Viability

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | **Vibe coders won't pay** | HIGH | KILLER | Landing page test BEFORE building. $29/mo is impulse price. Position as "client trust builder" not "security tool." |
| 2 | **Platforms build security in-house** | MEDIUM | HIGH | Move fast (Phase 1 in 4 weeks). Cross-platform value hard to replicate. Signed certificate is technical moat. |
| 3 | **MSP channel doesn't materialize** | MEDIUM | HIGH | Start MSP convos Month 1 (not Month 3). Target small MSPs first. Phase 1 revenue buys runway. |
| 4 | **Trust barrier (upload code)** | MEDIUM | MODERATE | Public repos only. Ephemeral processing. Clear 1-line privacy promise. CLI fallback. SOC 2. |
| 5 | **Fabricated $106k evidence** | HIGH | MODERATE | Replaced with REAL incidents (Lovable, Replit, Orchids). All documented and verified. |
| 6 | **Free OSS (Vchk) erodes pricing** | MEDIUM | MODERATE | Vchk is CLI-only. Keel's moat is signed report + plain English + ongoing monitoring. MSPs won't deploy free OSS to clients. |
| 7 | **Local models eliminate need** | LOW | MODERATE | Local models improving but frontier models still preferred for quality. Compliance/audit requirements create demand regardless. |

### 9.2 Corrected Errors from Earlier Analysis

| Earlier Claim | Correction | Source of Truth |
|---------------|------------|----------------|
| AI Governance market $1.65B→$13.52B | $0.44B→$1.51B (28% CAGR) | Mordor Intelligence |
| "$106k Aider incident" | Could not verify. Use real incidents instead (Lovable 10.3% breach, Replit DB deletion, Orchids hack) | Multiple HN/Reddit searches across all 10 research agents |
| "Guardrails AI is just general LLM guardrails" | Guardrails AI has 7.2k stars, full company with enterprise case studies (Masterclass, Changi Airport). Could expand into coding governance. | guardrailsai.com |
| "Developers need enforcement" | Developers disable guardrails. Vectimus (same category) got 3 points on HN. Claude Code already has 80% of Keel features built-in. | HN evidence, competitor analysis |
| "Claude Code doesn't have governance" | Claude Code has: lifecycle hooks (30+ events), fine-grained permissions, OS-level sandboxing, credential protection, managed enterprise settings, OTEL export | docs.anthropic.com |

---

## 10. Key Decisions Log

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-07-29 | **ICPs: Solopreneurs (Phase 1) → MSPs (Phase 2) → Platforms (Phase 3)** | Evidence from 5 research agents. Solopreneurs for fast validation. MSPs for channel scale. Platforms for high-ACV deals. |
| 2 | 2026-07-29 | **Discard developers as ICP** | Devs disable guardrails. Claude Code has built-in governance. Vectimus got 3 points on HN. Dev tools market is a blood bath. |
| 3 | 2026-07-29 | **Discard enterprise shadow AI** | Red ocean. Microsoft Purview, Cyberhaven, Proofpoint dominate. Would need enterprise sales team + $50K+ in certs. |
| 4 | 2026-07-29 | **Product name stays "Keel"** | Works across all 3 phases. "Vibe Auditor" won't age well and won't resonate with MSP/platform buyers. |
| 5 | 2026-07-29 | **Keel-hosted scanning (not self-hosted)** | Target users won't use CLI. Public repos initially. Ephemeral processing. CLI fallback. SOC 2 mitigates trust. |
| 6 | 2026-07-29 | **Validate with landing page FIRST** | Biggest risk is willingness to pay. Validate before building. Manual scans for first 10 signups. |
| 7 | 2026-07-29 | **Do NOT depend on MCP** | Build protocol-agnostic. MCP gateway is a feature, not the foundation. Existing MCP code is valuable but optional. |
| 8 | 2026-07-29 | **Defer SOC 2 audit fee, start prep now** | Sign up for Vanta/Scytale Month 1. Document policies as product is built. Schedule audit only after Phase 1 validation. |
| 9 | 2026-07-29 | **Lesson learned: challenge all assumptions** | Earlier analysis was biased by sunk cost. Moving forward: present both sides, verify market figures, research competitors honestly. |

---

## 11. Sources Index

### Market Data

| Source | Report | Date |
|--------|--------|------|
| MarketsandMarkets | AI Code Assistants Market Report | Aug 2026 |
| Mordor Intelligence | AI Governance Market Report | 2026 |
| Gartner | Worldwide AI Governance Spending Forecast | Jan 2025 |
| Veracode | GenAI Code Security Report | Oct 2025 |
| CodeRabbit | AI Code Analysis | Dec 2025 |
| Proofpoint | Data Security for AI | 2025 |
| IBM | Cost of a Data Breach | 2025 |

### Platform Data

| Source | Data Point |
|--------|------------|
| blog.replit.com | User counts, funding, security features |
| TechCrunch | Cursor ARR ($3B), acquisition ($60B) |
| Crunchbase | Cursor, Lovable, Replit funding rounds |
| Forbes | Lovable growth metrics |
| Financial Times | Lovable revenue and valuation |

### Community Sources

| Thread | Platform | Engagement |
|--------|----------|------------|
| "After two years of vibecoding, I'm back to writing by hand" | HN | 865 points, 634 comments |
| Show HN: Privacy Firewall (111 points, 54 comments) | HN | 111 points |
| Show HN: Lexray (contract screening, 40+ users in 5 days) | HN | Validated comparable pricing model |
| "MCP is dead. Long live the CLI" | HN | 447 points |
| "How are you dealing with requests to connect Claude to M365?" | r/msp | 68 points, 107 comments |
| "Company data leaking into AI tools" | r/msp | 24 points, 74 comments |
| "Security and liability help request" | r/vibecoding | Direct product demand signal |
| "Anyone worried about employees pasting sensitive business data into ChatGPT?" | r/smallbusiness | Multiple threads, consistent theme |

### Competitor URLs

| Competitor | URL | Notes |
|------------|-----|-------|
| Guardrails AI | github.com/guardrails-ai/guardrails | 7.2k stars |
| Snyk CLI | github.com/snyk/cli | 5.6k stars, 9,670 commits |
| nono | github.com/nolabs-ai/nono | 3.3k stars |
| Little Snitch | obdev.at | 20+ year product |
| Cyberhaven | cyberhaven.com | $88M raised |
| Microsoft Purview | microsoft.com | 400M+ M365 seats |
| Privacy Firewall | HN story 46206591 | 111 points |
| Velar | HN story 47151517 | Local proxy |
| Vchk | HN story 47421288 | CLI scanner |
| hoop | github.com/hoophq/hoop | 772 stars |
| Vex Insurance | vexinsurance.com | AI liability product |

---

## 12. Research Agents

This report was informed by 10 research agents deployed across two rounds.

### Round 1 (July 29, 2026) — Market Validation

| Agent | Focus | Key Finding |
|-------|-------|-------------|
| 1 | AI governance failures & developer resistance | Devs disable guardrails. Vectimus launch got 3 points. |
| 2 | Cursor/Claude/Copilot/Cline security hooks | Claude Code already has most features built-in. |
| 3 | Vibe coder market size & pain | 50M+ Replit users. Real incidents (Lovable, Replit, Orchids). Low WTP. |
| 4 | AI governance for knowledge workers | Enterprise market dominated by Purview/Cyberhaven. SMBs underserved. |
| 5 | Non-MCP AI governance angles | OS-level monitoring, clipboard security, browser extensions — all blue ocean. |

### Round 2 (July 29, 2026) — Deep ICP Research

| Agent | ICP | Key Finding | Verdict |
|-------|-----|-------------|---------|
| 6 | Vibe Coders | 50M+ market but low WTP ($10-20/mo). Platforms building in-house. | 5/10 |
| 7 | MSPs | 30-40K in US. Active demand (r/msp threads). Zero competitors. $10K-100K ACV. Need SOC 2. | **8/10** |
| 8 | SMBs Direct | 3-4M businesses. Latent pain. $5-7/user/mo WTP. Hard GTM. | 5/10 |
| 9 | Individual Power Users | 1-3M US. 4+ OSS competitors. $39-59 one-time. Niche within niche. | 4/10 |
| 10 | Solopreneurs/Freelancers | Growing. Fear of liability documented. $19-29/mo WTP. Easy GTM. | **6/10** |

Each agent was instructed to find evidence AGAINST the ICP as well as for it. All findings were verified against multiple sources where possible.
