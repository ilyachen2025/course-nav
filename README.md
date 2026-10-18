# 课程资料导航

内部培训与学习资源的统一入口页：**按分类浏览 · 标签筛选 · 标题搜索 · 一键跳转**。

基于 [MkDocs](https://www.mkdocs.org/) + [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 构建，输出纯静态站点，可部署到任意静态托管。

## 功能

| 功能 | 说明 |
|---|---|
| 分类展示 | 5 个一级分类，每类一页，卡片网格（Grid Cards） |
| 标签筛选 | 分类内按卡片徽标自动生成筛选条，支持多选叠加（并集），状态写入 URL 的 `?tag=` 参数 |
| 标题搜索 | Material 内置全文检索，`lang: zh` + jieba 中文分词，快捷键 `/` 或 `S` |
| 一键跳转 | 卡片底部「打开资料」新标签页直达外链 |

## 目录结构

```
course-nav/
├── mkdocs.yml              # 站点配置（主题、搜索、导航、脚本/CSS 挂载）
├── docs/
│   ├── index.md            # 首页：Hero + 5 个分类入口
│   ├── 01-onboarding.md    # 入职必修
│   ├── 02-product.md       # 产品与技术
│   ├── 03-bidding.md       # 商务与投标
│   ├── 04-engineering.md   # 工程与工具
│   ├── 05-policy.md        # 行业政策与标准
│   ├── javascripts/tags.js # 标签筛选逻辑（从 .badge 读标签，无需改内容）
│   └── stylesheets/extra.css
├── tests/
│   └── tag-filter.test.cjs # 标签筛选的 DOM 层测试（jsdom）
├── serve.py                # 本地预览服务（相对路径，任意机器可跑）
└── site/                   # 构建产物（不入库）
```

## 本地运行

```bash
# 1. 安装依赖
pip install mkdocs-material jieba

# 2. 预览（默认 http://127.0.0.1:8000）
mkdocs serve

# 3. 构建静态站到 site/
mkdocs build
```

## 如何新增一条资料

在对应分类的 `.md` 里，按下面的结构追加一个列表项即可，页面结构不用动：

```markdown
-   <span class="badge">标签</span> __资料标题__

    ---

    一句话说明。

    [:octicons-arrow-right-24: 打开资料](https://example.com/){ target=_blank rel=noopener }
```

**标签规则**：`<span class="badge">` 里的文字就是筛选标签。同页出现 2 个及以上不同标签时，筛选条自动生成；改标签文字即改筛选维度，无需改任何配置。

## 测试

```bash
mkdocs build
npm install jsdom            # 首次
NODE_PATH=./node_modules node tests/tag-filter.test.cjs
```

覆盖：筛选条生成、标签计数、单选/多选/取消、清除、空态、幂等性、全站 6 个页面、URL 参数恢复。

## 部署

`mkdocs build` 后把 `site/` 作为静态站点发布即可（GitHub Pages、EdgeOne Pages、Nginx 均可）。

> 注意：当前 `docs/` 下的 50 条为演示用测试数据，标题按内部培训场景拟写，链接指向公开真实站点。正式使用前请替换为内部资料地址。
