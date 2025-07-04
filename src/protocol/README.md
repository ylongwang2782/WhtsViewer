# Whts Protocol Library

这是一个用于处理Whts协议的JavaScript库，专门为后端角色设计。

## 文件结构

- `whts-protocol.js` - 核心协议库，包含帧格式、消息类型定义和解析器
- `whts-backend.js` - 后端工具类，简化协议库的使用
- `README.md` - 本说明文档

## 主要功能

### 1. 消息构建

```javascript
import { whtsBackend } from './protocol/whts-backend.js';

// 创建从机配置消息
const slaveConfigs = [
    {
        id: '46733B4E',
        conductionNum: '08',
        resistanceNum: '04', 
        clipMode: '01',
        clipStatus: '0000'
    }
];
const configMessage = whtsBackend.createSlaveConfigMessage(slaveConfigs);

// 创建控制消息
const ctrlMessage = whtsBackend.createCtrlMessage(1); // 1=开启, 0=停止

// 创建模式配置消息
const modeMessage = whtsBackend.createModeConfigMessage(0); // 0=导通, 1=阻值, 2=卡钉

// 创建设备列表请求消息
const deviceListMessage = whtsBackend.createDeviceListRequestMessage();
```

### 2. 数据解析

```javascript
// 解析接收到的数据
const parsedData = whtsBackend.parseReceivedData(receivedBytes);

// 检查消息类型
if (whtsBackend.isCtrlResponse(parsedData)) {
    // 处理控制响应
    const parsedMsg = whtsBackend.getParsedData(parsedData);
    console.log('运行状态:', parsedMsg.runningText);
}

if (whtsBackend.isSlave2BackendMessage(parsedData)) {
    // 处理从机数据
    const slaveId = whtsBackend.getSlaveId(parsedData);
    const deviceStatusBits = whtsBackend.getDeviceStatusBits(parsedData);
}
```

### 3. 工具函数

```javascript
// 验证十六进制字符串
const isValid = whtsBackend.validateHexString('AB CD 01 02');

// 转换十六进制字符串为字节数组
const bytes = whtsBackend.hexStringToBytes('AB CD 01 02');

// 转换字节数组为十六进制字符串
const hexString = whtsBackend.bytesToHexString(bytes);
```

## 协议常量

库中定义了所有协议相关的常量：

- 包类型：`PACKET_TYPES`
- Backend2Master消息类型：`BACKEND_TO_MASTER_MESSAGES`
- Master2Backend消息类型：`MASTER_TO_BACKEND_MESSAGES`
- Slave2Backend消息类型：`SLAVE_TO_BACKEND_MESSAGES`
- 检测模式：`DETECTION_MODES`

## 消息解析结果格式

解析后的数据包含以下字段：

```javascript
{
    isValid: true,              // 是否为有效帧
    packetType: 'Master2Backend', // 包类型名称
    message: 'CTRL_RSP_MSG',    // 消息类型名称
    slaveId: '0x46733B4E',      // 从机ID（如果有）
    deviceStatus: '0x1',        // 设备状态（如果有）
    payload: 'AB CD 01 02',     // 负载数据（十六进制）
    timestamp: '2:02:24 PM',    // 时间戳
    rawFrame: {...},            // 原始帧对象
    parsedMessage: {...}        // 解析后的消息对象
}
```

## 使用示例

参考 `App.vue` 中的实际使用方式，主要在以下函数中：

- `handleUdpData` - 处理UDP数据
- `handleCtrlCommand` - 发送控制命令
- `sendSlaveConfig` - 发送从机配置
- `switchDetectionMode` - 切换检测模式
- `queryDeviceList` - 查询设备列表 