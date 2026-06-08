# 美股基本面分析资料库

这是一个适合部署到 GitHub Pages 的静态网页项目。它会把本地 PDF/PPT 导出的报告整理成一个可交互资料库：

- 主题筛选
- 搜索
- PDF/PPT 幻灯片逐页浏览
- 缩略图导航
- 全屏阅读
- 一键打开原始 PDF

## 构建网页

默认读取：

```text
D:\美股基本面分析
```

运行：

```powershell
python build_site.py
```

生成内容在：

```text
docs/
```

## 本地预览

```powershell
cd docs
python -m http.server 8080
```

然后打开：

```text
http://127.0.0.1:8080
```

## 后续更新

1. 把新的 PDF 放到 `D:\美股基本面分析` 对应主题文件夹里。
2. 重新运行：

```powershell
python build_site.py
```

3. 提交并推送到 GitHub。
4. GitHub Pages 会更新网页内容。

## GitHub Pages 设置

仓库上传后，在 GitHub 里进入：

```text
Settings -> Pages -> Build and deployment
```

选择：

```text
Source: Deploy from a branch
Branch: main
Folder: /docs
```

保存后 GitHub 会生成一个公开网页地址。
