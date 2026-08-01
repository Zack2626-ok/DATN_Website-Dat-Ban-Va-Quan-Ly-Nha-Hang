@echo off
echo =======================================================
echo [*] DANG KHOI PHUC LAI CO SO DU LIEU (RESET DB)...
echo =======================================================

echo.
echo [1] Dang nap lai file SQLQuery1.sql...
mysql -u root -p123456 -e "DROP DATABASE IF EXISTS resmanager; CREATE DATABASE resmanager DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p123456 resmanager < SQLQuery1.sql

echo.
echo [2] Dang chay script seed de them du lieu mau test...
cd be
call npm run seed
cd ..

echo.
echo =======================================================
echo [V] HOAN TAT! Co so du lieu da tro ve trang thai ban dau.
echo =======================================================
pause
