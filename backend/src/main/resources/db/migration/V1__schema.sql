CREATE TABLE datasets(id BIGINT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(200) NOT NULL,sha VARCHAR(64) NOT NULL UNIQUE,created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,reference_name VARCHAR(500),samples TEXT,metadata TEXT,status VARCHAR(20),record_count BIGINT DEFAULT 0,error TEXT);
CREATE TABLE variants(id BIGINT AUTO_INCREMENT PRIMARY KEY,dataset_id BIGINT NOT NULL,line_no BIGINT NOT NULL,chrom VARCHAR(100) NOT NULL,pos BIGINT NOT NULL,variant_id TEXT,ref TEXT,alt TEXT,qual DOUBLE,filter_value VARCHAR(500),info TEXT,format_value TEXT,sample_value TEXT,type VARCHAR(30),warning TEXT,raw_line TEXT,FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE);
CREATE INDEX idx_coordinate ON variants(dataset_id,chrom,pos);
CREATE INDEX idx_type ON variants(dataset_id,type);
CREATE INDEX idx_quality ON variants(dataset_id,qual);
