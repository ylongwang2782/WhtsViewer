/**
 * Whts Protocol Library
 * 实现Whts协议的帧格式、包类型、消息类型的定义和处理
 */

// 协议常量定义
export const PROTOCOL_CONSTANTS = {
    // 帧头
    FRAME_HEADER: [0xAB, 0xCD],
    
    // 包类型
    PACKET_TYPES: {
        MASTER_TO_SLAVE: 0x00,
        SLAVE_TO_MASTER: 0x01,
        BACKEND_TO_MASTER: 0x02,
        MASTER_TO_BACKEND: 0x03,
        SLAVE_TO_BACKEND: 0x04
    },
    
    // Backend2Master消息类型
    BACKEND_TO_MASTER_MESSAGES: {
        SLAVE_CFG_MSG: 0x00,
        MODE_CFG_MSG: 0x01,
        SLAVE_RST_MSG: 0x02,
        CTRL_MSG: 0x03,
        INTERVAL_CFG_MSG: 0x06,
        PING_CTRL_MSG: 0x10,
        DEVICE_LIST_REQ_MSG: 0x11,
        CLEAR_DEVICE_LIST_MSG: 0x12
    },
    
    // Master2Backend消息类型
    MASTER_TO_BACKEND_MESSAGES: {
        SLAVE_CFG_RSP_MSG: 0x00,
        MODE_CFG_RSP_MSG: 0x01,
        SLAVE_RST_RSP_MSG: 0x02,
        CTRL_RSP_MSG: 0x03,
        PING_RES_MSG: 0x04,
        DEVICE_LIST_RSP_MSG: 0x05,
        INTERVAL_CFG_RSP_MSG: 0x06
    },
    
    // Slave2Backend消息类型
    SLAVE_TO_BACKEND_MESSAGES: {
        CONDUCTION_DATA_MSG: 0x00,
        RESISTANCE_DATA_MSG: 0x01,
        CLIP_DATA_MSG: 0x02
    },
    
    // 检测模式
    DETECTION_MODES: {
        CONDUCTION: 0,
        RESISTANCE: 1,
        CLIP: 2
    }
};

// 获取包类型名称
export function getPacketTypeName(packetId) {
    const typeMap = {
        [PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_SLAVE]: 'Master2Slave',
        [PROTOCOL_CONSTANTS.PACKET_TYPES.SLAVE_TO_MASTER]: 'Slave2Master',
        [PROTOCOL_CONSTANTS.PACKET_TYPES.BACKEND_TO_MASTER]: 'Backend2Master',
        [PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND]: 'Master2Backend',
        [PROTOCOL_CONSTANTS.PACKET_TYPES.SLAVE_TO_BACKEND]: 'Slave2Backend'
    };
    return typeMap[packetId] || `Unknown(0x${packetId.toString(16).toUpperCase()})`;
}

// 获取Backend2Master消息类型名称
export function getBackend2MasterMessageName(messageId) {
    const messageMap = {
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.SLAVE_CFG_MSG]: 'SLAVE_CFG_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.MODE_CFG_MSG]: 'MODE_CFG_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.SLAVE_RST_MSG]: 'SLAVE_RST_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.CTRL_MSG]: 'CTRL_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.INTERVAL_CFG_MSG]: 'INTERVAL_CFG_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.PING_CTRL_MSG]: 'PING_CTRL_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.DEVICE_LIST_REQ_MSG]: 'DEVICE_LIST_REQ_MSG',
        [PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.CLEAR_DEVICE_LIST_MSG]: 'CLEAR_DEVICE_LIST_MSG'
    };
    return messageMap[messageId] || `Unknown(0x${messageId.toString(16).toUpperCase()})`;
}

// 获取Master2Backend消息类型名称
export function getMaster2BackendMessageName(messageId) {
    const messageMap = {
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.SLAVE_CFG_RSP_MSG]: 'SLAVE_CFG_RSP_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.MODE_CFG_RSP_MSG]: 'MODE_CFG_RSP_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.SLAVE_RST_RSP_MSG]: 'SLAVE_RST_RSP_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.CTRL_RSP_MSG]: 'CTRL_RSP_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.PING_RES_MSG]: 'PING_RES_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.DEVICE_LIST_RSP_MSG]: 'DEVICE_LIST_RSP_MSG',
        [PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.INTERVAL_CFG_RSP_MSG]: 'INTERVAL_CFG_RSP_MSG'
    };
    return messageMap[messageId] || `Unknown(0x${messageId.toString(16).toUpperCase()})`;
}

// 获取Slave2Backend消息类型名称
export function getSlave2BackendMessageName(messageId) {
    const messageMap = {
        [PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.CONDUCTION_DATA_MSG]: 'CONDUCTION_DATA_MSG',
        [PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.RESISTANCE_DATA_MSG]: 'RESISTANCE_DATA_MSG',
        [PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.CLIP_DATA_MSG]: 'CLIP_DATA_MSG'
    };
    return messageMap[messageId] || `Unknown(0x${messageId.toString(16).toUpperCase()})`;
}

// 解析设备状态位
export function parseDeviceStatus(status) {
    return {
        cs: (status & 0x0001) ? '1' : '0',      // Color Sensor
        sl: (status & 0x0002) ? '1' : '0',      // Sleeve Limit
        eub: (status & 0x0004) ? '1' : '0',     // Electromagnet Unlock Button
        bla: (status & 0x0008) ? '1' : '0',     // Battery Low Alarm
        ps: (status & 0x0010) ? '1' : '0',      // Pressure Sensor
        el1: (status & 0x0020) ? '1' : '0',     // Electromagnetic Lock1
        el2: (status & 0x0040) ? '1' : '0',     // Electromagnetic Lock2
        a1: (status & 0x0080) ? '1' : '0',      // Accessory1
        a2: (status & 0x0100) ? '1' : '0'       // Accessory2
    };
}

// 帧解析类
export class WhtsFrame {
    constructor() {
        this.header = null;
        this.packetId = null;
        this.sequence = null;
        this.moreFragments = null;
        this.length = null;
        this.payload = null;
    }

    // 从字节数组解析帧
    static parseFromBytes(data) {
        const bytes = new Uint8Array(data);
        
        // 检查数据长度是否足够
        if (bytes.length < 7) {
            return null;
        }

        // 检查帧头
        if (bytes[0] !== PROTOCOL_CONSTANTS.FRAME_HEADER[0] || 
            bytes[1] !== PROTOCOL_CONSTANTS.FRAME_HEADER[1]) {
            return null;
        }

        const frame = new WhtsFrame();
        frame.header = [bytes[0], bytes[1]];
        frame.packetId = bytes[2];
        frame.sequence = bytes[3];
        frame.moreFragments = bytes[4];
        frame.length = bytes[5] | (bytes[6] << 8); // 小端格式

        // 检查数据长度是否合理
        if (frame.length + 7 > bytes.length) {
            return null;
        }

        // 提取payload
        frame.payload = bytes.slice(7, 7 + frame.length);
        
        return frame;
    }

    // 转换为字节数组
    toBytes() {
        const result = new Uint8Array(7 + this.length);
        result[0] = PROTOCOL_CONSTANTS.FRAME_HEADER[0];
        result[1] = PROTOCOL_CONSTANTS.FRAME_HEADER[1];
        result[2] = this.packetId;
        result[3] = this.sequence;
        result[4] = this.moreFragments;
        result[5] = this.length & 0xFF;        // 小端格式
        result[6] = (this.length >> 8) & 0xFF;
        result.set(this.payload, 7);
        return result;
    }

    // 获取payload的十六进制字符串表示
    getPayloadHexString() {
        return Array.from(this.payload)
            .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
            .join(' ');
    }
}

// Backend2Master消息构建器
export class Backend2MasterMessageBuilder {
    // 构建从机配置消息
    static buildSlaveConfigMessage(slaveConfigs) {
        const data = [];
        
        // Message ID
        data.push(PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.SLAVE_CFG_MSG);
        
        // Slave数量
        data.push(slaveConfigs.length);
        
        slaveConfigs.forEach(slave => {
            // Slave ID (4 bytes, little endian)
            const idBytes = [];
            for (let i = 0; i < 8; i += 2) {
                idBytes.push(parseInt(slave.id.slice(i, i + 2), 16));
            }
            data.push(...idBytes.reverse()); // 小端序
            
            // Conduction Num (1 byte)
            data.push(parseInt(slave.conductionNum, 16));
            
            // Resistance Num (1 byte)
            data.push(parseInt(slave.resistanceNum, 16));
            
            // Clip Mode (1 byte)
            data.push(parseInt(slave.clipMode, 16));
            
            // Clip Status (2 bytes, little endian)
            const statusValue = parseInt(slave.clipStatus, 16);
            data.push(statusValue & 0xFF);
            data.push((statusValue >> 8) & 0xFF);
        });
        
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建模式配置消息
    static buildModeConfigMessage(mode) {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.MODE_CFG_MSG,
            mode
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建控制消息
    static buildCtrlMessage(runningStatus) {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.CTRL_MSG,
            runningStatus
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建设备列表请求消息
    static buildDeviceListRequestMessage() {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.DEVICE_LIST_REQ_MSG,
            0x00 // Reserve
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建间隔配置消息
    static buildIntervalConfigMessage(intervalMs) {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.INTERVAL_CFG_MSG,
            intervalMs // 间隔时间(ms)
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建清除设备列表消息
    static buildClearDeviceListMessage() {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.CLEAR_DEVICE_LIST_MSG,
            0x00 // Reserve
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建Ping控制消息
    static buildPingCtrlMessage(pingMode, pingCount, interval, destinationId) {
        const data = [
            PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.PING_CTRL_MSG,
            pingMode, // 0=单次Ping, 1=连续Ping
            pingCount & 0xFF, (pingCount >> 8) & 0xFF, // Ping次数 (2字节，小端)
            interval & 0xFF, (interval >> 8) & 0xFF,   // 间隔时间 (2字节，小端)
            destinationId & 0xFF, (destinationId >> 8) & 0xFF,  // 目标设备ID (4字节，小端)
            (destinationId >> 16) & 0xFF, (destinationId >> 24) & 0xFF
        ];
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建从机复位消息
    static buildSlaveResetMessage(slaveResetConfigs) {
        const data = [];
        
        // Message ID
        data.push(PROTOCOL_CONSTANTS.BACKEND_TO_MASTER_MESSAGES.SLAVE_RST_MSG);
        
        // Slave数量
        data.push(slaveResetConfigs.length);
        
        slaveResetConfigs.forEach(slave => {
            // Slave ID (4 bytes, little endian)
            const idBytes = [];
            for (let i = 0; i < 8; i += 2) {
                idBytes.push(parseInt(slave.id.slice(i, i + 2), 16));
            }
            data.push(...idBytes.reverse()); // 小端序
            
            // Lock状态 (1 byte) - 1:上锁, 0:解锁
            data.push(parseInt(slave.lock));
            
            // Clip Status (2 bytes, little endian) - 需要复位的卡钉孔位
            const clipStatus = parseInt(slave.clipStatus, 16);
            data.push(clipStatus & 0xFF, (clipStatus >> 8) & 0xFF);
        });
        
        return Backend2MasterMessageBuilder._buildFrame(data);
    }
    
    // 构建帧的通用方法
    static _buildFrame(payloadData) {
        const frame = new WhtsFrame();
        frame.packetId = PROTOCOL_CONSTANTS.PACKET_TYPES.BACKEND_TO_MASTER;
        frame.sequence = 0x00;
        frame.moreFragments = 0x00;
        frame.length = payloadData.length;
        frame.payload = new Uint8Array(payloadData);
        return frame.toBytes();
    }
}

// Master2Backend消息解析器
export class Master2BackendMessageParser {
    // 解析Master2Backend消息
    static parseMessage(frame) {
        if (frame.packetId !== PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND || 
            frame.length === 0) {
            return null;
        }
        
        const messageId = frame.payload[0];
        const messageName = getMaster2BackendMessageName(messageId);
        const messagePayload = frame.payload.slice(1);
        
        const result = {
            messageId,
            messageName,
            payload: messagePayload,
            payloadHex: Array.from(messagePayload)
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ')
        };
        
        // 根据消息类型进行特定解析
        switch (messageId) {
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.SLAVE_CFG_RSP_MSG:
                result.parsedData = Master2BackendMessageParser._parseSlaveConfigResponse(messagePayload);
                break;
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.MODE_CFG_RSP_MSG:
                result.parsedData = Master2BackendMessageParser._parseModeConfigResponse(messagePayload);
                break;
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.CTRL_RSP_MSG:
                result.parsedData = Master2BackendMessageParser._parseCtrlResponse(messagePayload);
                break;
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.DEVICE_LIST_RSP_MSG:
                result.parsedData = Master2BackendMessageParser._parseDeviceListResponse(messagePayload);
                break;
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.PING_RES_MSG:
                result.parsedData = Master2BackendMessageParser._parsePingResponse(messagePayload);
                break;
            case PROTOCOL_CONSTANTS.MASTER_TO_BACKEND_MESSAGES.INTERVAL_CFG_RSP_MSG:
                result.parsedData = Master2BackendMessageParser._parseIntervalConfigResponse(messagePayload);
                break;
        }
        
        return result;
    }
    
    // 解析从机配置响应
    static _parseSlaveConfigResponse(payload) {
        if (payload.length < 2) return null;
        
        const status = payload[0];
        const slaveNum = payload[1];
        
        return {
            status,
            slaveNum,
            statusText: status === 0 ? '正常' : '异常'
        };
    }
    
    // 解析模式配置响应
    static _parseModeConfigResponse(payload) {
        if (payload.length < 2) return null;
        
        const status = payload[0];
        const mode = payload[1];
        const modeNames = ['导通检测模式', '阻值检测模式', '卡钉检测模式'];
        
        return {
            status,
            mode,
            statusText: status === 0 ? '正常' : '异常',
            modeText: modeNames[mode] || '未知模式'
        };
    }
    
    // 解析控制响应
    static _parseCtrlResponse(payload) {
        if (payload.length < 2) return null;
        
        const status = payload[0];
        const runningStatus = payload[1];
        
        return {
            status,
            runningStatus,
            statusText: status === 0 ? '正常' : '异常',
            runningText: runningStatus === 1 ? '开启' : '停止'
        };
    }
    
    // 解析设备列表响应
    static _parseDeviceListResponse(payload) {
        if (payload.length < 1) return null;
        
        const deviceCount = payload[0];
        const devices = [];
        
        let offset = 1;
        for (let i = 0; i < deviceCount; i++) {
            if (offset + 10 > payload.length) break;
            
            // 设备ID (4字节，小端)
            const deviceIdBytes = payload.slice(offset, offset + 4);
            const deviceId = Array.from(deviceIdBytes).reverse()
                .map(b => b.toString(16).padStart(2, '0')).join('');
            offset += 4;
            
            // 短ID (1字节)
            const shortId = payload[offset];
            offset += 1;
            
            // 在线状态 (1字节)
            const online = payload[offset] === 1;
            offset += 1;
            
            // 版本号
            const versionMajor = payload[offset];
            const versionMinor = payload[offset + 1];
            const versionPatch = payload[offset + 2] | (payload[offset + 3] << 8);
            offset += 4;
            
            devices.push({
                deviceId,
                shortId,
                online,
                versionMajor,
                versionMinor,
                versionPatch
            });
        }
        
        return {
            deviceCount,
            devices
        };
    }
    
    // 解析Ping响应
    static _parsePingResponse(payload) {
        if (payload.length < 9) return null;
        
        const pingMode = payload[0];
        const totalCount = payload[1] | (payload[2] << 8);
        const successCount = payload[3] | (payload[4] << 8);
        const destinationId = payload[5] | (payload[6] << 8) | (payload[7] << 16) | (payload[8] << 24);
        
        return {
            pingMode,
            totalCount,
            successCount,
            destinationId,
            pingModeText: pingMode === 0 ? '单次Ping' : '连续Ping',
            successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    // 解析间隔配置响应
    static _parseIntervalConfigResponse(payload) {
        if (payload.length < 2) return null;
        
        const status = payload[0];
        const intervalMs = payload[1];
        
        return {
            status,
            intervalMs,
            statusText: status === 0 ? '正常' : '异常'
        };
    }
}

// Slave2Backend消息解析器
export class Slave2BackendMessageParser {
    // 解析Slave2Backend消息
    static parseMessage(frame) {
        if (frame.packetId !== PROTOCOL_CONSTANTS.PACKET_TYPES.SLAVE_TO_BACKEND || 
            frame.length < 7) {
            return null;
        }
        
        const messageId = frame.payload[0];
        const messageName = getSlave2BackendMessageName(messageId);
        
        // 解析Slave ID (4字节，小端)
        const slaveId = frame.payload[1] | (frame.payload[2] << 8) | 
                       (frame.payload[3] << 16) | (frame.payload[4] << 24);
        
        // 解析Device Status (2字节)
        const deviceStatus = frame.payload[5] | (frame.payload[6] << 8);
        const deviceStatusBits = parseDeviceStatus(deviceStatus);
        
        const result = {
            messageId,
            messageName,
            slaveId: `0x${slaveId.toString(16).toUpperCase()}`,
            deviceStatus: `0x${deviceStatus.toString(16).toUpperCase()}`,
            deviceStatusBits,
            payload: frame.payload.slice(7),
            payloadHex: ''
        };
        
        // 根据消息类型进行特定解析
        switch (messageId) {
            case PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.CONDUCTION_DATA_MSG:
                result.parsedData = Slave2BackendMessageParser._parseConductionData(frame.payload.slice(7));
                result.payloadHex = Array.from(result.parsedData.conductionData)
                    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ');
                break;
            case PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.RESISTANCE_DATA_MSG:
                result.parsedData = Slave2BackendMessageParser._parseResistanceData(frame.payload.slice(7));
                result.payloadHex = Array.from(result.parsedData.resistanceData)
                    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ');
                break;
            case PROTOCOL_CONSTANTS.SLAVE_TO_BACKEND_MESSAGES.CLIP_DATA_MSG:
                result.parsedData = Slave2BackendMessageParser._parseClipData(frame.payload.slice(7));
                result.payloadHex = `0x${result.parsedData.clipData.toString(16).toUpperCase()}`;
                break;
            default:
                result.payloadHex = Array.from(frame.payload.slice(7))
                    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ');
        }
        
        return result;
    }
    
    // 解析导通数据
    static _parseConductionData(payload) {
        if (payload.length < 2) return null;
        
        const conductionLength = payload[0] | (payload[1] << 8);
        const conductionData = payload.slice(2, 2 + conductionLength);
        
        return {
            conductionLength,
            conductionData
        };
    }
    
    // 解析阻值数据
    static _parseResistanceData(payload) {
        if (payload.length < 2) return null;
        
        const resistanceLength = payload[0] | (payload[1] << 8);
        const resistanceData = payload.slice(2, 2 + resistanceLength);
        
        return {
            resistanceLength,
            resistanceData
        };
    }
    
    // 解析卡钉数据
    static _parseClipData(payload) {
        if (payload.length < 2) return null;
        
        const clipData = payload[0] | (payload[1] << 8);
        
        return {
            clipData
        };
    }
}

// 通用协议解析器
export class WhtsProtocolParser {
    // 解析Whts协议数据
    static parseData(data) {
        const frame = WhtsFrame.parseFromBytes(data);
        if (!frame) {
            return null;
        }
        
        const result = {
            frame,
            packetType: getPacketTypeName(frame.packetId),
            message: null
        };
        
        // 根据包类型进行消息解析
        switch (frame.packetId) {
            case PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND:
                result.message = Master2BackendMessageParser.parseMessage(frame);
                break;
            case PROTOCOL_CONSTANTS.PACKET_TYPES.SLAVE_TO_BACKEND:
                result.message = Slave2BackendMessageParser.parseMessage(frame);
                break;
        }
        
        return result;
    }
} 