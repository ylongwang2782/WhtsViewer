# Frame Format
The protocol is composed of Frames, Packets, and Messages.

以下所有数据采用小端格式

| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Frame Delimiter | uint8 | 2 Byte | 0xAB、0xCD |
| Packet ID | u8 | 1 Byte |  |
| Fragments Sequence | u8 | 1 Byte | 帧分片的序号 |
| More FragmentsFlag | u8 | 1 Byte | 0：无更多分片<br/>1：有更多分片 |
| Packet Length | u16 | 2 Byte | 数据长度 |
| Packet Payload | u8 | Payload Size | 帧实际负载 |


| Packet ID | Value | 描述 |
| --- | --- | --- |
| Master2Slave | 0x00 | 主机->从机 |
| Slave2Master | 0x01 | 从机->主机 |
| Backend2Master | 0x02 | 上位机->主机 |
| Master2Backend | 0x03 | 主机->上位机 |
| Slave2Backend | 0x04 | 从机->上位机 |

## Backend2Master Packet
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Message ID | u8  | 1 Byte | 消息 ID |
| Payload |  | Payload Size |  |


| Message ID | Value | 描述 |
| --- | --- | --- |
| SLAVE_CFG_MSG | 0x00 | 配置消息 |
| MODE_CFG_MSG | 0x01 | 模式配置消息 |
| SLAVE_RST_MSG | 0x02 | 复位消息 |
| CTRL_MSG | 0x03 | 控制消息 |
| PING_CTRL_MSG | 0x10 | Ping控制指令 |
| DEVICE_LIST_REQ_MSG | 0x11 | 设备列表请求 |


### Slave Config Message
| Data | | Type | Length | Description |
| --- | --- | --- | --- | --- |
| Slave Num | | u8 | 1 Byte | 从机数量 |
| Slave 0 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Conduction Num | u8 | 1 Byte | 导通检测数量 |
| | Resistance Num | u8 | 1 Byte | 阻值检测数量 |
| | Clip Mode | u8 | 1 Byte | 卡钉检测模式 |
| | Clip Status | u16 | 2 Byte | 卡钉初始化状态 |
| Slave 1 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Conduction Num | u8 | 1 Byte | 导通检测数量 |
| | Resistance Num | u8 | 1 Byte | 阻值检测数量 |
| | Clip Mode | u8 | 1 Byte | 卡钉检测模式 |
| | Clip Status | u16 | 2 Byte | 卡钉初始化状态 |
| More Slave ... |  |  |  |  |


### Mode Config Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Mode | u8 | 1 Byte | 0：导通检测模式<br/>1：阻值检测模式<br/>2：卡钉检测模式 |


### Slave Reset Message
| Data | | Type | Length | Description |
| --- | --- | --- | --- | --- |
| Slave Num | | u8 | 1 Byte | 包含的从机数量 |
| Slave 0 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Lock | u8 | 1 Byte | 锁状态控制<br/>1：上锁<br/>0：解锁 |
| | Clip Status | u16 | 2 Byte | 需要复位的卡钉孔位 |
| Slave 1 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Lock | u8 | 1 Byte | 锁状态控制<br/>1：上锁<br/>0：解锁 |
| | Clip Status | u16 | 2 Byte | 需要复位的卡钉孔位 |
| More Slave ... |  |  |  |  |


### Ctrl Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Running Status | u8 | 1 Byte | 运行状态控制<br/>0：停止<br/>1：开启 |


### Ping Ctrl Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Ping Mode | u8 | 1 Byte | 0：单次Ping1：连续Ping |
| Ping Count | u16 | 2 Bytes | Ping的次数 |
| Interval | u16 | 2 Bytes | Ping间隔，单位 ms |
| Destination ID | u32 | 4 Bytes | 目标设备 ID，支持广播 |


### Device List Request Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Reserve | u8 | 1 Byte | 0 |


## Master2Backend Packet
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Message ID | u8 | 1 Byte | 消息 ID |
| Message Payload |  | Payload Size |  |


| Message ID | Value | 描述 |
| --- | --- | --- |
| SLAVE_CFG_RSP_MSG | 0x00 | 配置消息 |
| MODE_CFG_RSP_MSG | 0x01 | 模式配置消息 |
| SLAVE_RST_RSP_MSG | 0x02 | 复位消息 |
| CTRL_RSP_MSG | 0x03 | 控制消息 |
| PING_RES_MSG | 0x04 | Ping检测结果消息 |
| DEVICE_LIST_RSP_MSG | 0x05 | 设备列表回复消息 |


### Slave Config Response Message
| Data | | Type | Length | Description |
| --- | --- | --- | --- | --- |
| Status | | u8 | 1 Byte | 响应状态<br/>0：正常<br/>1：异常 |
| Slave Num | | u8 | 1 Byte | 从机数量 |
| Slave 0 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Conduction Num | u8 | 1 Byte | 导通检测数量 |
| | Resistance Num | u8 | 1 Byte | 阻值检测数量 |
| | Clip Mode | u8 | 1 Byte | 卡钉检测模式 |
| | Clip Status | u16 | 2 Byte | 卡钉初始化状态 |
| Slave 1 | ID | u8 | 4 Byte | 4 个字节的从机 ID |
| | Conduction Num | u8 | 1 Byte | 导通检测数量 |
| | Resistance Num | u8 | 1 Byte | 阻值检测数量 |
| | Clip Mode | u8 | 1 Byte | 卡钉检测模式 |
| | Clip Status | u16 | 2 Byte | 卡钉初始化状态 |
| ... |  |  |  |  |


### Mode Config Response Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Status | u8 | 1 Byte | 响应状态 |
| Mode | u8 | 1 Byte | 0：导通检测模式<br/>1：阻值检测模式<br/>2：卡钉检测模式 |


### Slave Reset Response Message
| Data | | Type | Length | Description | |
| --- | --- | --- | --- | --- | --- |
| Status | | u8 | 1 Byte | 响应状态 | 响应状态 |
| Slave Num | | u8 | 1 Byte | 包含的从机数量 | |
| Slave 0 | ID | u8 | 4 Byte | 4 个字节的从机 ID | |
| | Lock | u8 | 1 Byte | 锁状态控制<br/>1：上锁<br/>0：解锁 | |
| | Clip Status | u16 | 2 Byte | 需要复位的卡钉孔位 | |
| Slave 1 | ID | u8 | 4 Byte | 4 个字节的从机 ID | |
| | Lock | u8 | 1 Byte | 锁状态控制<br/>1：上锁<br/>0：解锁 | |
| | Clip Status | u16 | 2 Byte | 需要复位的卡钉孔位 | |
| ... |  |  |  |  | |


### Ctrl Response Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Status | u8 | 1 Byte | 响应状态<br/>0：响应正常<br/>1：响应异常 |
| Running Status | u8 | 1 Byte | 运行状态控制<br/>0：停止<br/>1：开启 |


### Ping Response Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Ping Mode | u8 | 1 Byte | 0：单次Ping <br/>1：连续Ping |
| Total Count | u16 | 2 Bytes | 总发送次数 |
| Success Count | u16 | 2 Bytes | 成功收到次数 |
| Destination ID | u32 | 4 Bytes | 目标设备 ID |


### Device List Response Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Device Count | u8 | 1 Byte | 当前主机管理的设备数量 |
| Device ID | u32 | 4 Byte | 设备唯一全局 ID |
| Short ID | u8 | 1 Byte | 主机分配的短 ID |
| Online | u8 | 1 Byte |  在线状态（1=在线，0=离线）   |
| VersionMajor | u8 | 1 Byte | 固件主版本号 |
| VersionMinor | u8 | 1 Byte | 固件次版本号 |
| VersionPatch | u16 | 2 Byte | 固件补丁版本号 |


## Slave2Backend Packet
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Message ID | u8 | 1 Byte | 消息 ID |
| Slave ID | uint32_t | 4 Byte | 本机 ID |
| Device Status | DeviceStatus | 2 Byte | 状态字 |
| Payload |  | Payload Size |  |


| Message ID | Value | 描述 |
| --- | --- | --- |
| CONDUCTION_DATA_MSG | 0x00 | 导通数据 |
| RESISTANCE_DATA_MSG | 0x01 | 阻值数据 |
| CLIP_DATA_MSG | 0x02 | 卡钉数据 |


| Device Status | Type | Length | Description |
| --- | --- | --- | --- |
| Color Sensor | 颜色传感器匹配状态 | 1 bit | 0，颜色不匹配或无传感器<br/>1，颜色匹配 |
| Sleeve Limit | 限位开关状态 | 1 bit | 0，探针断开；<br/>1，探针导通 |
| Electromagnet Unlock Button | 电磁锁解锁按钮 | 1 bit | 0，按钮未按下；<br/>1，按钮按下 |
| Battery Low Alarm | 电池低电量报警 | 1 bit | 0，电池正常；<br/>1，电池低电量 |
| Pressure Sensor | 气压传感器 | 1 bit | 0，气压传感器断开；<br/>1，气压传感器触发 |
| Electromagnetic Lock1 | 电磁锁1状态 | 1 bit | 0，电磁锁1未锁；<br/>1，电磁锁1上锁 |
| Electromagnetic Lock2 | 电磁锁 2 状态 | 1 bit | 0，电磁锁 2 未锁；<br/>1，电磁锁 2 上锁 |
| Accessory1 | 辅件 1 状态 | 1 bit | 0，辅件1不存在；<br/>1，辅件1存在 |
| Accessory2 | 辅件 2 状态  | 1 bit | 0，辅件 2 不存在；<br/>1，辅件 2 存在 |
| Reserved | 保留字节 | 7 bit |  |


### Conduction Data Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Conduction Length | u16 | 2 Byte | 导通数据字段长度 |
| Conduction Data | u8 | Conduction Length | 导通数据 |


### Resistance Data Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Resistance Length | u16 | 2 Bytes | 阻值数据长度 |
| Resistance Data | u8 | Resistance Length | 阻值数据 |


### Clip Data Message
| Data | Type | Length | Description |
| --- | --- | --- | --- |
| Clip Data | u16 | 2 Byte | 卡钉板数据 |


# Document Version
| Version | Date | Description |
| --- | --- | --- |
| v1.0 | 20250103 | + 初次发布 |
| v1.1 | 20250225 | + 优化了帧、包和消息描述 |
| v1.2                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 20250306 | + 删除了 Harness Config 消息<br/>+ 新增 Conduction Config Message<br/>+ 新增 Resistance Config Message<br/>+ 新增 CLip Data Message<br/>+ 新增 Conduction Data Message<br/>+ 新增 Resistance Data Message<br/>+ 新增 CLip Data Message<br/>+ 删除 Command Packet，Command Reply Packet<br/>+ 新增 Master2Slave, Slave2Master Packet 极其描述<br/>+ 新增 Packet ID List 和 Message ID List |
| v1.3 | 20250312 | + 修改阻值数据的检测和存储形式为二维矩阵，以支持线阻检测<br/>+ 修改卡钉板数量为卡钉板有无<br/>+ 卡钉数据固定为 2 Bytes |
| v1.4 | 20250319 | + 修正卡钉相关参数，包括删除 Clip Num 以适配卡钉灯控功能<br/>+ 新增 Slave2Master Packet 中 info 消息内容<br/>+ 新增卡钉自锁和非自锁模式配置字段 |
| v1.5 | 20250321 | + 数据配置新增 interval 关键字<br/>+ 读取数据类型拆分，读取操作全部独立为消息 |
| v1.6 | 20250410 | + 新增 Master2Backend Packet，现在支持主机通过十六进制向上位机发送数据<br/>+ 新增 Backend2Master Packet，现在支持上位机通过十六进制向主机发送指令<br/>+ 新增 Slave Config Message, Mode Config Message, RST Message, CTRL Message 及其回复<br/>+ 修改 config message 及其回复，根据命令-响应模式简化设计<br/>+ 新增 Slave2Backend Packet。主要包含数据消息，从机的数据消息将直接透传到上位机<br/>+ 删除 Slave2Master Packet 中的数据消息<br/>+ Slave2Backend Packet 新增 Slave ID |
| v1.7 | 20250429 | + 新增 Ping Req Message, Ping Rsp Message, Ping Ctrl Message, Ping Res Message, 提供了完整的 ping-pong 通信机制<br/>+ 新增 Anounce Message, Short ID Assign Message, Short ID Confirm Message，以实现轻量的组网机制 |
| v1.8 | 20250611 | + 针对所有命令和回复消息名称相同的消息，全部修改并添加 Response 关键字以方便区分<br/>+ 原 Rst Msg 修改为 Slave Rst Msg 和 Slave Rst Response Msg |


