# VariantScope 工作空间重设计

## 实现前的结构方案

本方案先于本轮界面实现提交。保留 Java、MySQL、VCF 解析、分页、筛选和导出接口。

### 参考观察

- [Linear 官方 UI 重设计](https://linear.app/now/how-we-redesigned-the-linear-ui)：实际查看官方应用截图；借鉴连续工作空间、紧凑导航、统一分隔线、列表与详情并列的结构，不复制品牌资产。
- [Vercel Web Analytics](https://vercel.com/docs/analytics)：实际查看官方 visitor-chart-light 截图；借鉴贴近主图的精简指标和有主次的分析区域。VCF 没有访问时间序列，因此不照搬折线图。
- [Seqera Platform quickstart](https://docs.seqera.io/platform-cloud/quickstart)：实际查看官方 Datasets 截图；文件目录、状态与搜索先于上传表单，导入作为明确操作。
- [gnomAD 官方基因页截图](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/)：当前在线基因页出现 ChunkLoadError，改为查看官方发布的基因页截图。借鉴坐标上下文、贴近表格的筛选、精确等位基因和高密度记录。没有基因注释、频率和覆盖数据，不添加这些轨道。

参考图片仅用于本地研究，未复制到产品或仓库中。

### 页面蓝图

1. 外壳：约 190 px 中性浅灰导航、50 px 工具栏、单一内容层，无模拟 macOS 窗口。紫色仅用于选中、操作和主图。标题、内容、表头共享基线。
2. 数据上下文：选择器、参考版本、样本、状态组成单行范围栏，窄屏换行；取消巨大数据集卡片。
3. 概览：紧凑指标摘要；主图为实际碱基替换分布，旁列类型构成；下方紧凑 Contig / QUAL 分布；最近文件采用行列表。单一分组自动缩短图高。
4. 数据集：目录优先；搜索名称、状态筛选、本地排序（明确只覆盖 API 返回的最近 200 个文件）；主操作打开导入面板，公开示例为次要入口；保留拖放、校验和真实进度。
5. 变异：不再重复 KPI 与分析图；范围栏、筛选、可分页表格构成主视图，选中坐标在并列检查器显示原文、INFO、GT 和计算说明。窄屏检查器放在表格之前，关闭后回到原坐标。
6. 分析：共享已应用的筛选；数量/占比切换、全部/组成/质量视图；位置主图与替换图形成比较区域，类型、Contig、质量、FILTER 为辅助图。占比分母为各图所列记录总数，Tooltip 保留原始数量。图表筛选沿用后端请求。
7. 说明：文档目录与正文，简洁说明口径、来源和边界。

### 统一规范

系统无衬线字体与 PingFang SC 回退，无专有字体文件。正文 13 px，标题 20 px，区块标题 13 px，指标 25 px；等宽字体仅用于坐标和原始字段，数字使用 tabular-nums。间距基于 4 px；控件 30–34 px；圆角 5–8 px；阴影只用于浮层；普通内容以细分隔线分组。统一按钮、表格、状态标签、空态、加载和错误反馈。尊重 reduced-motion。

### 验证计划

使用现有 ClinVar 真实 1,000 条记录，保留单 Contig、缺失质量分数等真实分布。修改前后以相同数据抓取页面，1440 px 和窄屏逐页检查；执行组件测试、前端构建、后端测试与 HTTP 回归；实际验证过滤、分页、详情、导入异常、CSV 与 PNG 导出。记录真实结果，不用静态数据代替运行页面。

## 实现与验收（2026-11-25）

### 相对旧版的实质变化

| 页面 | 旧结构 | 本轮结构与交互 |
| --- | --- | --- |
| 全局 | 模拟桌面窗口边框、蓝灰材料、宽导航 | 连续页面画布、190 px 中性导航、50 px 工具栏、细分隔线与局部紫色强调；统一字号和控件几何 |
| 概览 | 巨大文件摘要与指标组合卡，单 Contig 图占优先位置，替换图在下方 | 文件范围栏与指标带分开；替换主图 + 类型侧图；Contig / QUAL 为紧凑诊断行；最近导入为文件行 |
| 数据集 | 大上传区与示例说明先于目录 | 文件目录优先；名称搜索、状态组合筛选、导入时间/名称排序；导入面板按需展开，顶部入口直接打开；显式标明最近 200 文件的本地筛选范围 |
| 变异 | KPI 摘要后再看表格，详情打开模态抽屉 | 移除重复 KPI，仅保留一行范围摘要；可滚动表格与并列检查器。窄屏检查器置于表前，展开时定位、关闭恢复原位置；Escape 关闭；原文、GT、INFO 与计算字段保留 |
| 分析 | 多个分布面板连续排列 | 替换/类型对比行、位置/Contig 辅助行、质量/FILTER 行；数量/占比切换、全部/组成/质量主题；图表分类点击后留在分析页，后端重新计算同一筛选范围 |
| 说明 | 大宣传标题与卡片 | 文档目录 + 阅读正文；锚点滚动不改变应用路由 |

数量/占比切换作用于一般分布图，类型图始终同时显示数量与占比。各图分母是该图所列记录总数：替换图只包含可计入的标准 SNV，不能把它的占比理解为全部 VCF 的占比。Tooltip 保留真实数量。单分组图缩短高度，避免构造不存在的类别。变异类型顺序固定为 SNV、插入、缺失、复杂替换、未分类。

### 复用与边界

继续复用 `DatasetContext`、`MetricSummary`、`FilterBar`、`VariantTable`、`VariantDetail`、`UiDialog`、`UiIcon`、`StatusBadge`、`LoadingSkeleton` 和 ECharts `Chart`；新建 `OverviewView`、`AnalysisView`，重构 `DatasetManager`。`App.vue` 保留请求生命周期、过期响应保护、上传、筛选、分页与删除等控制逻辑。没有修改 Java 后端、数据库表或 API 契约，没有添加付费 API、外部字体依赖、第三方界面资产或假数据。

浏览器验证发现数值下拉列表在视口边缘被遮挡，最终改为图内原位展开，避免浮层被裁切或被顶部工具栏拦截。FILTER 的 `.` 单独说明为未提供过滤标签，不再沿用 QUAL 文案。移动端筛选默认收起，以优先展示结果；桌面默认展开。

### 真实结果

- 前端：`npm test`，4 个测试文件，**24 / 24 通过**。新增数量/占比与 Tooltip、FILTER 缺失说明、目录组合筛选、详情检查器、分析页筛选联动等回归。
- 前端：`npm run build`，TypeScript 检查与 Vite 构建通过；入口 JS 123.32 kB（gzip 47.21 kB），图表仍异步加载。
- 后端：`mvn -f backend/pom.xml test`，**11 / 11 通过**，含两份迁移脚本在测试库的执行；本机 MySQL 8 的既有 V2 数据库正常连接。
- 实际 MySQL HTTP 验收：`python3 scripts/smoke.py` 全通过，覆盖上传、缺失参考版本、GT、组合查询、分页、统计、CSV 转义、重新分析、非法查询、重复导入、格式错误及清理。
- 浏览器上传 `data/synthetic-boundaries.vcf`，明确命名为 SYNTHETIC UI workspace acceptance，实际导入 8 条，详情 GT `0/1`；筛选 SNV 后下载 CSV，3 条数据行。该临时数据集已经通过确认弹窗删除，仅保留原有 ClinVar 数据。
- 浏览器下载 PNG 成功，测试导出文件为 1426 × 436 像素。实际切换分析主题，质量主题只显示 QUAL / FILTER。
- ClinVar 图表数值列表选择“插入”，分析页维持当前路由，后端总数 **35**；切换变异浏览、翻页显示 **26–50 / 1,000**。
- 通过浏览器网络节流观察真实加载骨架；临时断网观察错误、清空旧统计并恢复连接重试。未伪造接口响应。
- 五页分别在 **1440 × 1000** 和 **390 × 844** 检查；页面 scrollWidth 均等于视口宽度，表格使用独立横向滚动。原始结果见 [浏览器检查记录](workspace-browser-audit.json)。移动端菜单可展开/导航后关闭；详情自动定位距顶部约 62 px，获得焦点。
- 本轮不重复后端性能基准，未声称性能提升；历史真实基准仍见 README 与既有测试文档。

### 当前真实截图

截图均来自本机 Vue + Java + MySQL 和原有 `ClinVar-GRCh38-1000.vcf`（总数 1,000，SNV 922，插入 35，缺失 37，复杂替换 5，未分类 1，Ti/Tv 630/292 ≈ 2.158）。无样本列、QUAL 全缺失、仅 Contig 1 都照实保留。旧版截图由提交 `0535bd1` 的前端在独立临时目录运行，连接同一个后端；等待图表完全加载后截图，没有还原或绘制虚假的旧界面。右上粉色翻译浮标来自本机浏览器扩展，不属于 VariantScope。

| 页面 | 旧版 1440 px | 新版 1440 px | 新版 390 px |
| --- | --- | --- | --- |
| 概览 | [旧版](screenshots/workspace/before-overview.png) | [新版](screenshots/workspace/after-overview.png) | [窄屏](screenshots/workspace/mobile-overview.png) |
| 数据集 | [旧版](screenshots/workspace/before-datasets.png) | [新版](screenshots/workspace/after-datasets.png) | [窄屏](screenshots/workspace/mobile-datasets.png) |
| 变异 | [旧版](screenshots/workspace/before-variants.png) | [新版与详情](screenshots/workspace/after-variants.png) | [窄屏与详情](screenshots/workspace/mobile-variants.png) |
| 分析 | [旧版](screenshots/workspace/before-analysis.png) | [新版](screenshots/workspace/after-analysis.png) | [窄屏](screenshots/workspace/mobile-analysis.png) |
| 说明 | [旧版](screenshots/workspace/before-about.png) | [新版](screenshots/workspace/after-about.png) | [窄屏](screenshots/workspace/mobile-about.png) |

[概览并排对比](screenshots/workspace/compare-overview.png) · [变异并排对比](screenshots/workspace/compare-variants.png) · [空态](screenshots/workspace/empty.png) · [加载态](screenshots/workspace/loading.png) · [错误态](screenshots/workspace/error.png)

### 已知限制

文件目录搜索/排序只覆盖接口返回的最近 200 个数据集。超宽表格仍需横向滚动，长 REF/ALT 在表格内省略、完整内容可在检查器查看。移动端详情是可独立滚动的面板。位置图仍受后端 10,000 个非空箱的上限约束。未新增 gnomAD 的基因模型、群体频率、覆盖深度、临床判定等分析能力。当前公开示例是局部截取，不能验证全基因组分布，已额外用明确标识的合成边界文件验证多 Contig、QUAL、GT 等情况。浏览器验证为当前 Chromium 环境，未声称完成 Safari/Firefox 真机覆盖。
