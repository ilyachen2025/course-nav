/* ============================================================
 * 分类内标签筛选
 * 从卡片里的 .badge 自动读取标签，生成筛选条，支持多选叠加。
 * 不依赖任何内容结构改动：卡片没有 .badge 时自动跳过，不会渲染筛选条。
 * ============================================================ */
(function () {
  "use strict";

  var GRID_FLAG = "data-tag-filter-ready";
  var PARAM = "tag";

  /* ---------- 工具 ---------- */

  function tagOf(li) {
    var badge = li.querySelector(".badge");
    var text = badge ? badge.textContent.replace(/\s+/g, "").trim() : "";
    return text || "未分类";
  }

  function readSelection() {
    try {
      var m = new URLSearchParams(window.location.search).get(PARAM);
      if (!m) return [];
      return m.split(",").map(decodeURIComponent).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeSelection(selected) {
    try {
      var url = new URL(window.location.href);
      if (selected.length) {
        url.searchParams.set(PARAM, selected.join(","));
      } else {
        url.searchParams.delete(PARAM);
      }
      window.history.replaceState(null, "", url);
    } catch (e) {
      /* 静态托管或预览环境下不支持时静默降级 */
    }
  }

  /* ---------- 构建筛选条 ---------- */

  function buildBar(tags, counts, total, selected) {
    var wrap = document.createElement("div");
    wrap.className = "tag-filter";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "按标签筛选");

    var chips = document.createElement("div");
    chips.className = "tag-filter__chips";

    var meta = document.createElement("div");
    meta.className = "tag-filter__meta";

    function makeChip(label, value, count, isActive) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-chip" + (isActive ? " is-active" : "");
      btn.setAttribute("data-tag", value);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");

      var name = document.createElement("span");
      name.textContent = label;
      btn.appendChild(name);

      if (typeof count === "number") {
        var num = document.createElement("span");
        num.className = "tag-chip__count";
        num.textContent = count;
        btn.appendChild(num);
      }
      return btn;
    }

    chips.appendChild(makeChip("全部", "", total, selected.length === 0));
    tags.forEach(function (t) {
      chips.appendChild(makeChip(t, t, counts[t], selected.indexOf(t) !== -1));
    });

    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "tag-filter__clear";
    clear.textContent = "清除筛选";
    clear.hidden = true;

    wrap.appendChild(chips);
    wrap.appendChild(clear);
    wrap.appendChild(meta);

    return { wrap: wrap, chips: chips, meta: meta, clear: clear };
  }

  /* ---------- 应用筛选 ---------- */

  function applyState(cards, bar, selected) {
    var shown = 0;

    cards.forEach(function (li) {
      var t = li.getAttribute("data-tags") || "";
      var hit = selected.length === 0 || selected.indexOf(t) !== -1;
      li.hidden = !hit;
      if (hit) shown++;
    });

    Array.prototype.forEach.call(bar.chips.querySelectorAll(".tag-chip"), function (chip) {
      var v = chip.getAttribute("data-tag");
      var on = v === "" ? selected.length === 0 : selected.indexOf(v) !== -1;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });

    bar.clear.hidden = selected.length === 0;
    bar.meta.textContent = selected.length === 0
      ? "共 " + cards.length + " 条资料"
      : "已选 " + selected.join(" + ") + " · 显示 " + shown + " / " + cards.length + " 条";

    var empty = bar.wrap.parentNode.querySelector(".tag-filter__empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "tag-filter__empty";
      empty.textContent = "没有匹配的资料，试试取消部分标签。";
      bar.wrap.parentNode.insertBefore(empty, bar.wrap.nextSibling);
    }
    empty.hidden = shown !== 0;
  }

  /* ---------- 绑定事件 ---------- */

  function bind(cards, bar, selected) {
    bar.chips.addEventListener("click", function (ev) {
      var chip = ev.target.closest(".tag-chip");
      if (!chip) return;

      var v = chip.getAttribute("data-tag");
      if (v === "") {
        selected.length = 0;
      } else {
        var i = selected.indexOf(v);
        if (i === -1) {
          selected.push(v);
        } else {
          selected.splice(i, 1);
        }
      }
      applyState(cards, bar, selected);
      writeSelection(selected);
    });

    bar.clear.addEventListener("click", function () {
      selected.length = 0;
      applyState(cards, bar, selected);
      writeSelection(selected);
    });
  }

  /* ---------- 初始化 ---------- */

  function init(scope) {
    var root = scope || document;
    var grids = root.querySelectorAll(".md-content .grid.cards");

    Array.prototype.forEach.call(grids, function (grid) {
      if (grid.hasAttribute(GRID_FLAG)) return;

      var cards = Array.prototype.slice.call(grid.querySelectorAll(":scope > ul > li"));
      if (cards.length < 2) return;

      var counts = {};
      cards.forEach(function (li) {
        var t = tagOf(li);
        li.setAttribute("data-tags", t);
        counts[t] = (counts[t] || 0) + 1;
      });

      var tags = Object.keys(counts);
      if (tags.length < 2) return;

      tags.sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b, "zh-Hans-CN");
      });

      var known = readSelection().filter(function (t) {
        return tags.indexOf(t) !== -1;
      });

      var bar = buildBar(tags, counts, cards.length, known);
      grid.parentNode.insertBefore(bar.wrap, grid);
      grid.setAttribute(GRID_FLAG, "1");

      var selected = known;
      bind(cards, bar, selected);
      applyState(cards, bar, selected);
    });
  }

  /* ---------- 启动（兼容 Material 即时导航） ---------- */

  function boot() {
    if (window.document$ && typeof window.document$.subscribe === "function") {
      window.document$.subscribe(function () {
        init(document);
      });
    } else if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        init(document);
      });
    } else {
      init(document);
    }

    /* 兜底：Material 的 document$ 若晚于本脚本就绪，再补一次（幂等，不会重复渲染） */
    window.setTimeout(function () {
      init(document);
    }, 500);
  }

  boot();
})();
