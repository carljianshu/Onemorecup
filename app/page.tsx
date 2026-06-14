"use client";

import Link from "next/link";
import { PublicFeatureLinks } from "@/components/PublicFeatureLinks";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>淘汰赛竞猜</h1>
        <p>预测世界杯淘汰赛走势，与好友同台竞技</p>
      </section>

      <section className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>简单规则</h2>
        <ul className="rules-list">
          <li>提交竞猜共分两页：第一页 16 题，第二页 8 题，共 24 个项目。</li>
          <li>每个项目选 1 支球队，也可以不选；每选 1 项默认下注 10 分。</li>
          <li>每页最多可选 1 题 <strong>Double</strong>，该题下注 20 分。</li>
          <li>
            所有玩家对一场比赛的下注构成奖池。该奖池将平分给猜对的玩家，猜错的玩家损失竞猜下注的分数。
          </li>
          <li>第一页至少猜 8 题，第二页至少猜 4 题，一共至少猜 16 题。</li>
          <li>若所有参与者都猜对或都猜错，该项目所有人得 0 分。</li>
          <li>总分最高者获胜，同分并列。</li>
        </ul>

        <div className="actions">
          <Link className="btn btn-primary" href="/play">
            进入竞猜
          </Link>
          <PublicFeatureLinks />
        </div>
      </section>
    </main>
  );
}
