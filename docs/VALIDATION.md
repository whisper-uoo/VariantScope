# V1.0 验收记录

验收日期：2026-11-24（Asia/Shanghai）。原生 macOS ARM64、Java 17.0.20.1、MySQL Community 8.0.45，Spring Boot 3.5.4；Java 堆上限 `-Xmx512m`。数据库由本项目专用 datadir 和端口 3307 运行，不使用其他项目数据库。本机自带 MySQL 26.7 初始化崩溃，故下载官方 MySQL 8.0.45 独立完成验证。

## 自动化及真实业务验证

- `mvn -f backend/pom.xml verify`：11 个测试，0 failures、0 errors；6 个解析/分类/GT/INFO 测试，5 个数据库导入/查询/统计/异常测试。
- H2 MySQL 模式应用 Flyway V1、V2 成功；真实 MySQL 8 上 V1 初始迁移及 V1→V2 升级均成功，flyway_schema_history 两项 success=1。
- `npm run build`：vue-tsc 与 Vite 生产构建成功。ECharts 按需引入后 JS 约 598 kB（gzip 206 kB），仍有大于 500 kB 的非阻塞体积提示。
- `python3 scripts/smoke.py`：真实 HTTP 验收通过，验证导入、未知参考版本保持空、GT 原文、AND 条件、分页不同记录、统计、CSV 公式前缀转义、重新分析、非法排序/范围/页大小、重复拒绝、畸形文件清理、上传路径忽略和删除。
- 浏览器实际导入 ClinVar 示例成功；SNV 筛选 922 条；打开 1:69134 详情，INFO 与 GT 缺失展示正确；点击染色体柱进入 chrom=1 筛选。
- 浏览器真实下载 PNG（1234×540）与 CSV 成功；六类统计图渲染成功；手机 390px 检查修复后 scrollWidth=390，没有页面横向溢出。
- 最终截图来自运行中的页面，存于 `docs/screenshots/`。临时图表下载及手机检查图不作为最终科研结果。

## 公开数据结果

ClinVar 原始头部及前 1000 条记录：SNV=922、INSERTION=35、DELETION=37、COMPLEX=5、UNSUPPORTED=1；Ti=630、Tv=292、Ti/Tv=2.1575342466。全部记录位于染色体 1，QUAL 缺失，不补造其他染色体或质量分数。参考版本 GRCh38 来自文件头，非系统猜测。

## 性能实测

使用 `scripts/benchmark.py`，单客户端、同机 HTTP、MySQL 驱动开启 rewriteBatchedStatements。每个输入含 22 条合成染色体、GT、QUAL；每次测 25 个 chrom=1 & minQual=20 的 25 条分页查询；统计为未筛选的完整数据集。脚本最终删除自身数据。JSON 原始结果见同目录。

| 记录数 | 文件字节 | 导入秒 | 记录/秒 | 查询中位 ms | 查询 P95 ms | 全量统计 ms | 导入采样 RSS 峰值 KiB |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100000 | 4410362 | 2.539 | 39382 | 7.086 | 7.967 | 385.615 | 416944 |
| 1000000 | 46102182 | 25.633 | 39012 | 81.875 | 112.865 | 7474.360 | 372496 |

RSS 每 100ms 由系统 ps 采样，只覆盖导入阶段，包含 JVM 原生内存；不是精确堆峰值，也不涵盖全量统计阶段。两次测试有 JVM 预热和 GC 状态差异，百万次运行的采样峰值低于十万次并不代表内存随数据量下降。未测 CPU 百分比、数据库 RSS、系统总资源峰值或多用户负载。性能输入明确为合成数据，不是科研样本。百万记录全量统计耗时约 7.5 秒，V1 尚无统计缓存。

## 验证边界

Docker Compose 未执行（本机无 Docker）；未做 bcftools/HTSJDK 交叉验证，没有声称完整覆盖 VCF 规范；无登录/多用户隔离、gzip/BCF、多样本、变异归一化、参考序列比对、临床解释、断点续传。进程崩溃恢复与公网生产加固属于后续工作。GitHub CI 结果以对应 Actions 页面实际状态为准。
