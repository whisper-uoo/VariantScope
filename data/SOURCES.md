# 示例数据来源与使用范围

`clinvar-grch38-subset.vcf` 来自 NCBI ClinVar 公开 VCF，保留原始头部和前 1000 条记录，未改变记录字段。

- 原始下载： https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz
- 获取日期：2026-11-24；文件头 fileDate=2026-11-22，VCFv4.1，reference=GRCh38。
- SHA-256：`e4dd025428dec888548fca3b0936a6c015777f3a7a5363ab74dcfb09a87bc115`
- 许可依据：NCBI [提交说明](https://www.ncbi.nlm.nih.gov/clinvar/docs/submit/) 说明进入 ClinVar 的数据可无限制分发；[数据使用政策](https://www.ncbi.nlm.nih.gov/clinvar/docs/maintenance_use/) 要求复制或分发时注明 ClinVar 来源。此处按该数据政策再分发，不能将本项目 MIT 软件许可套用于第三方数据。
- 引用：Landrum et al., ClinVar: improving access to variant interpretations and supporting evidence, Nucleic Acids Research, PMID: 29165669。
- 数据为变异级公开汇总，无样本列或个人身份信息。不是合成数据，不是个人全基因组。
- 因按文件顺序截取，本子集全部位于染色体 1，QUAL 与 FILTER 为缺失值，不能据此评价全基因组分布或样本质量。
- 临床相关注释保留于原始 INFO 中；平台不推断、重新分类或验证这些注释，不将缺失注释解释为良性。

`synthetic-boundaries.vcf` 是项目生成的明确标记为合成的单样本边界样例，涵盖 SNV、InDel、多等位、符号 ALT、复杂替换及缺失数据，不表示真实患者或真实参考基因组。
`benchmark.py` 运行时生成的输入也是合成数据，不作为科研发现。
