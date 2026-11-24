# HTTP API

统一前缀 `/api`，JSON 错误格式 `{ "message": "原因" }`；缺失数据集 404，参数或重复文件 400，内部错误 500。

| 方法 | 路径 | 行为 |
|---|---|---|
| GET | /datasets | 最近 200 个数据集（元数据原文通过详情读取） |
| POST | /datasets | multipart：file、name、可选 reference；同步流式导入，返回 READY 或 FAILED 数据集 |
| GET | /datasets/{id} | 包含 VCF 元数据原文的数据集详情 |
| DELETE | /datasets/{id} | 删除并级联清理记录 |
| POST | /datasets/{id}/reanalyze | 从存储记录重新计算全量统计，不重新上传或修复原文件 |
| GET | /datasets/{id}/variants | 后端分页、排序及组合筛选 |
| GET | /datasets/{id}/stats | 当前筛选的 SQL 聚合统计 |
| GET | /datasets/{id}/export | 当前筛选结果的流式 CSV，固定导入顺序 |

筛选参数：chrom、start、end、type、minQual、filter、variantId，均为 AND 组合。坐标为 1-based 闭区间；染色体、FILTER、ID 精确匹配，缺失值为 `.`。type 为 SNV/INSERTION/DELETION/COMPLEX/UNSUPPORTED。数据库默认排序规则可能不区分大小写。

分页：page 从 0 开始，size 为 1–200；sort 仅支持 id/chrom/pos/qual，direction 为 asc/desc；同值按 id 稳定排序。QUAL 缺失排序遵循 MySQL NULL 规则。
CSV 使用 RFC4180 双引号转义，文本以 =、+、-、@ 开头时添加单引号，降低表格公式执行风险，因而此类字段不是逐字节原样导出。

导入使用单进程信号量限制为一次一个任务，其他请求明确拒绝；SHA-256 防止同文件重复导入。FAILED 文件重试需先删除失败条目。上传进度是网络传输进度，后续解析为不定进度；可通过数据集列表查看已写入计数。进程异常终止可能遗留 IMPORTING 条目，需管理员确认后清理，不声称支持断点续传。
