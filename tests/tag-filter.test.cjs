/* 标签筛选 · DOM 层功能测试
 * 用法：NODE_PATH=<node workspace>/node_modules node tests/tag-filter.test.cjs
 * 前提：先执行 mkdocs build（读取 site/ 下已构建的 HTML）
 */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const PAGE = path.join(ROOT, "site", "01-onboarding", "index.html");
const JS = path.join(ROOT, "docs", "javascripts", "tags.js");

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${ok ? "" : `  期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`}`);
  ok ? pass++ : fail++;
}

function visibleCards(doc) {
  return Array.from(doc.querySelectorAll(".grid.cards > ul > li")).filter((li) => !li.hidden);
}

(async () => {
  const html = fs.readFileSync(PAGE, "utf8");
  const js = fs.readFileSync(JS, "utf8");

  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://localhost:8000/01-onboarding/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const doc = window.document;

  window.eval(js);
  await new Promise((r) => setTimeout(r, 700)); // 等兜底定时器跑完

  console.log("\n【1】筛选条生成");
  const bar = doc.querySelector(".tag-filter");
  check("筛选条已插入", !!bar, true);
  const grid = doc.querySelector(".md-content .grid.cards");
  check("筛选条在网格之前（文档序）", bar.compareDocumentPosition(grid) & 4 /* FOLLOWING */, 4);

  const chips = Array.from(doc.querySelectorAll(".tag-chip"));
  check("按钮数量（全部 + 5 个标签）", chips.length, 6);
  const tagCounts = {};
  chips.slice(1).forEach((c) => {
    tagCounts[c.getAttribute("data-tag")] = Number(c.querySelector(".tag-chip__count").textContent);
  });
  check(
    "各标签数量",
    Object.entries(tagCounts).sort((a, b) => a[0].localeCompare(b[0], "zh")),
    Object.entries({ 协同: 1, 制度: 2, 财务: 2, 人事: 2, 合规: 3 }).sort((a, b) => a[0].localeCompare(b[0], "zh"))
  );
  check("『全部』按钮计数为 10", chips[0].querySelector(".tag-chip__count").textContent, "10");
  check("默认显示全部 10 条", visibleCards(doc).length, 10);

  console.log("\n【2】单选筛选");
  const chip = (name) => doc.querySelector(`.tag-chip[data-tag="${name}"]`);
  chip("合规").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("点『合规』后可见", visibleCards(doc).length, 3);
  check("『合规』高亮", chip("合规").classList.contains("is-active"), true);
  check("清除按钮出现", doc.querySelector(".tag-filter__clear").hidden, false);

  console.log("\n【3】多选叠加（并集）");
  chip("协同").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("合规 + 协同 后可见", visibleCards(doc).length, 4);
  check("计数文案", doc.querySelector(".tag-filter__meta").textContent.includes("/ 10 条"), true);

  console.log("\n【4】再次点击取消单个标签");
  chip("合规").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("仅剩『协同』", visibleCards(doc).length, 1);
  check("『合规』取消高亮", chip("合规").classList.contains("is-active"), false);

  console.log("\n【5】清除与空态");
  doc.querySelector(".tag-filter__clear").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("清除后全部可见", visibleCards(doc).length, 10);
  check("清除按钮隐藏", doc.querySelector(".tag-filter__clear").hidden, true);
  check("空态提示隐藏", doc.querySelector(".tag-filter__empty").hidden, true);

  console.log("\n【6】幂等性（重复初始化不重复渲染）");
  window.eval(js);
  await new Promise((r) => setTimeout(r, 200));
  check("筛选条仍然只有一个", doc.querySelectorAll(".tag-filter").length, 1);

  console.log("\n【7】全站页面覆盖（期望值由页面实际徽标推算，非写死）");
  const pages = [
    "index.html",
    "01-onboarding/index.html",
    "02-product/index.html",
    "03-bidding/index.html",
    "04-engineering/index.html",
    "05-policy/index.html",
  ];
  for (const rel of pages) {
    const d = new JSDOM(fs.readFileSync(path.join(ROOT, "site", rel), "utf8"), {
      runScripts: "outside-only",
      url: "http://localhost:8000/" + rel,
      pretendToBeVisual: true,
    });
    const ddoc = d.window.document;

    const badges = Array.from(ddoc.querySelectorAll(".grid.cards .badge"))
      .map((b) => b.textContent.replace(/\s+/g, "").trim())
      .filter(Boolean);
    const distinct = Array.from(new Set(badges));
    const expected = distinct.length >= 2 ? distinct.length + 1 : 0;

    d.window.eval(js);
    await new Promise((r) => setTimeout(r, 600));

    const n = ddoc.querySelectorAll(".tag-chip").length;
    check(`${rel} 筛选按钮数（${distinct.length} 个标签${expected ? " + 全部" : "，不渲染"}）`, n, expected);

    if (expected) {
      const tagged = ddoc.querySelectorAll(".grid.cards li[data-tags]").length;
      const cards = ddoc.querySelectorAll(".grid.cards > ul > li").length;
      check(`${rel} 每张卡片都打上标签`, tagged, cards);
    }
    d.window.close();
  }

  console.log("\n【8】URL 参数恢复筛选状态");
  const d2 = new JSDOM(fs.readFileSync(PAGE, "utf8"), {
    runScripts: "outside-only",
    url: "http://localhost:8000/01-onboarding/?tag=%E8%B4%A2%E5%8A%A1", // ?tag=财务
    pretendToBeVisual: true,
  });
  d2.window.eval(js);
  await new Promise((r) => setTimeout(r, 600));
  const vis2 = Array.from(d2.window.document.querySelectorAll(".grid.cards > ul > li")).filter((li) => !li.hidden);
  check("带 ?tag=财务 打开时只剩 2 条", vis2.length, 2);
  check("对应按钮自动高亮", d2.window.document.querySelector('.tag-chip[data-tag="财务"]').classList.contains("is-active"), true);
  d2.window.close();

  console.log(`\n结果：${pass} 通过，${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})();
