-- ========================================
-- 北京看房地图 - 数据库初始化脚本
-- ========================================

USE house_map;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 房屋表
CREATE TABLE IF NOT EXISTS houses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '小区名称',
    address VARCHAR(255) COMMENT '详细地址',
    longitude DECIMAL(10, 6) NOT NULL COMMENT '经度',
    latitude DECIMAL(10, 6) NOT NULL COMMENT '纬度',
    building_no VARCHAR(20) COMMENT '楼号',
    floor INT COMMENT '楼层',
    total_floors INT COMMENT '总层数',
    area DECIMAL(10, 2) COMMENT '面积(平米)',
    price DECIMAL(12, 2) COMMENT '价格(万元)',
    beike_url VARCHAR(500) COMMENT '贝壳链接',
    notes TEXT COMMENT '备注/评价',
    rating INT DEFAULT 0 COMMENT '评分1-5',
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT '标签名称',
    color VARCHAR(7) DEFAULT '#52c41a' COMMENT '标签颜色',
    icon VARCHAR(50) COMMENT '图标'
);

-- 房屋-标签关联表
CREATE TABLE IF NOT EXISTS house_tags (
    house_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (house_id, tag_id),
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 图片表
CREATE TABLE IF NOT EXISTS house_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    house_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    file_name VARCHAR(255) COMMENT '原始文件名',
    description VARCHAR(255) COMMENT '图片描述',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
);

-- 插入默认管理员账户 (密码: admin123)
INSERT IGNORE INTO users (username, password_hash, role) VALUES 
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.71E8Z1rIHmN5Xa', 'admin');

-- 插入预设标签
INSERT IGNORE INTO tags (name, color, icon) VALUES 
('南北通透', '#52c41a', '🌬️'),
('有电梯', '#1890ff', '🛗'),
('近地铁', '#722ed1', '🚇'),
('学区房', '#fa8c16', '🏫'),
('有IMAX', '#eb2f96', '🎬'),
('有杜比影院', '#eb2f96', '🎭'),
('近公园', '#13c2c2', '🌳'),
('近医院', '#f5222d', '🏥'),
('精装修', '#faad14', '✨'),
('毛坯房', '#8c8c8c', '🏗️'),
('顶层', '#595959', '🔝'),
('底层', '#595959', '⬇️'),
('临街', '#ff4d4f', '🔊'),
('安静', '#52c41a', '🤫');
