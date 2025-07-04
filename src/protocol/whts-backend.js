/**
 * Whts Backend Protocol Utilities
 * 专门为后端角色提供的协议工具类
 */

import {
    PROTOCOL_CONSTANTS,
    WhtsProtocolParser,
    Backend2MasterMessageBuilder,
    parseDeviceStatus
} from './whts-protocol.js';

// 后端协议工具类
export class WhtsBackendProtocol {
    constructor() {
        this.parser = WhtsProtocolParser;
    }

    // 解析接收到的数据
    parseReceivedData(data) {
        const result = this.parser.parseData(data);
        if (!result) {
            // 如果解析失败，返回原始数据的十六进制表示
            const hexData = Array.from(new Uint8Array(data))
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ');
            
            return {
                isValid: false,
                packetType: 'Invalid Frame',
                message: '--',
                slaveId: '--',
                deviceStatus: '--',
                payload: hexData,
                timestamp: new Date().toLocaleTimeString()
            };
        }

        // 构建统一的日志条目格式
        const logEntry = {
            isValid: true,
            packetType: result.packetType,
            message: result.message?.messageName || '--',
            slaveId: result.message?.slaveId || '--',
            deviceStatus: result.message?.deviceStatus || '--',
            payload: result.message?.payloadHex || result.frame.getPayloadHexString(),
            timestamp: new Date().toLocaleTimeString(),
            rawFrame: result.frame,
            parsedMessage: result.message
        };

        return logEntry;
    }

    // 创建从机配置消息
    createSlaveConfigMessage(slaveConfigs) {
        return Backend2MasterMessageBuilder.buildSlaveConfigMessage(slaveConfigs);
    }

    // 创建模式配置消息
    createModeConfigMessage(mode) {
        return Backend2MasterMessageBuilder.buildModeConfigMessage(mode);
    }

    // 创建控制消息
    createCtrlMessage(runningStatus) {
        return Backend2MasterMessageBuilder.buildCtrlMessage(runningStatus);
    }

    // 创建设备列表请求消息
    createDeviceListRequestMessage() {
        return Backend2MasterMessageBuilder.buildDeviceListRequestMessage();
    }

    // 检查是否为Master2Backend控制响应
    isCtrlResponse(parsedData) {
        return parsedData.isValid && 
               parsedData.rawFrame?.packetId === PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND &&
               parsedData.parsedMessage?.messageName === 'CTRL_RSP_MSG';
    }

    // 检查是否为Master2Backend配置响应
    isSlaveConfigResponse(parsedData) {
        return parsedData.isValid && 
               parsedData.rawFrame?.packetId === PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND &&
               parsedData.parsedMessage?.messageName === 'SLAVE_CFG_RSP_MSG';
    }

    // 检查是否为Master2Backend模式配置响应
    isModeConfigResponse(parsedData) {
        return parsedData.isValid && 
               parsedData.rawFrame?.packetId === PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND &&
               parsedData.parsedMessage?.messageName === 'MODE_CFG_RSP_MSG';
    }

    // 检查是否为Master2Backend设备列表响应
    isDeviceListResponse(parsedData) {
        return parsedData.isValid && 
               parsedData.rawFrame?.packetId === PROTOCOL_CONSTANTS.PACKET_TYPES.MASTER_TO_BACKEND &&
               parsedData.parsedMessage?.messageName === 'DEVICE_LIST_RSP_MSG';
    }

    // 检查是否为Slave2Backend消息
    isSlave2BackendMessage(parsedData) {
        return parsedData.isValid && 
               parsedData.rawFrame?.packetId === PROTOCOL_CONSTANTS.PACKET_TYPES.SLAVE_TO_BACKEND;
    }

    // 检查是否为导通数据消息
    isConductionDataMessage(parsedData) {
        return this.isSlave2BackendMessage(parsedData) &&
               parsedData.parsedMessage?.messageName === 'CONDUCTION_DATA_MSG';
    }

    // 获取设备状态解析结果
    getDeviceStatusBits(parsedData) {
        if (!parsedData.parsedMessage?.deviceStatusBits) {
            return null;
        }
        return parsedData.parsedMessage.deviceStatusBits;
    }

    // 获取从机ID
    getSlaveId(parsedData) {
        return parsedData.parsedMessage?.slaveId || null;
    }

    // 获取解析后的数据
    getParsedData(parsedData) {
        return parsedData.parsedMessage?.parsedData || null;
    }

    // 获取检测模式常量
    getDetectionModes() {
        return PROTOCOL_CONSTANTS.DETECTION_MODES;
    }

    // 获取检测模式名称
    getDetectionModeName(mode) {
        const modeNames = ['导通检测模式', '阻值检测模式', '卡钉检测模式'];
        return modeNames[mode] || '未知模式';
    }

    // 验证十六进制字符串
    validateHexString(hexString) {
        const cleanHex = hexString.replace(/\s+/g, '');
        return /^[0-9A-Fa-f]+$/.test(cleanHex) && cleanHex.length % 2 === 0;
    }

    // 转换十六进制字符串为字节数组
    hexStringToBytes(hexString) {
        const cleanHex = hexString.replace(/\s+/g, '');
        if (!this.validateHexString(cleanHex)) {
            throw new Error('Invalid hex string');
        }
        return new Uint8Array(cleanHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    }

    // 转换字节数组为十六进制字符串
    bytesToHexString(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
            .join(' ');
    }
}

// 创建全局实例
export const whtsBackend = new WhtsBackendProtocol(); 