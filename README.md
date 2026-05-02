# -React-TypeScript---
前端 React + TypeScript 实现类 Excel 网格（20×20），支持单元格选择、输入文字/数字、公式（以 = 开头）。通过 WebSocket 与 Node.js 同步用户操作（如 setCell）。Node.js 广播变更到房间内其他用户。当单元格内容为公式时，Node.js 调用 Java 服务（gRPC 或 REST）计算结果，再将结果返回前端显示。Java 使用表达式求值库（如 Aviator）实现公式计算。支持 SUM、AVG、MAX、MIN 等基础函数。每个房间有一个表格状态，用户可实时协作，显示其他用户光标位置。实现简单权限（所有者可踢人）。本地保存最近编辑记录。输出前端、Node.js、Java 三端代码。
