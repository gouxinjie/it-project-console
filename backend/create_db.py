import pymysql
from app.core.config import settings

def create_database():
    host = settings.MYSQL_SERVER
    user = settings.MYSQL_USER
    password = settings.MYSQL_PASSWORD
    port = int(settings.MYSQL_PORT)
    db_name = settings.MYSQL_DB

    try:
        # 连接到 MySQL (不指定数据库)
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port
        )
        
        try:
            with connection.cursor() as cursor:
                # 创建数据库
                sql = f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4;"
                cursor.execute(sql)
                print(f"数据库 '{db_name}' 检查/创建成功！")
        finally:
            connection.close()
            
    except Exception as e:
        print(f"创建数据库失败: {e}")
        print("请确保本地 MySQL 服务已启动，且密码正确。")

if __name__ == "__main__":
    create_database()
