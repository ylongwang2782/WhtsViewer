<template>
    <div class="serial-port-assistant">
        <el-container>
            <el-header>
                <el-row :gutter="20" class="mb-20">
                    <el-col :span="4">
                        <el-select v-model="communicationType" placeholder="通信方式"
                            @change="handleCommunicationTypeChange">
                            <el-option label="串口" value="serial" />
                            <el-option label="UDP" value="udp" />
                        </el-select>
                    </el-col>
                    <!-- 串口配置 -->
                    <el-col :span="8" v-if="communicationType === 'serial'">
                        <el-select v-model="selectedPort" placeholder="选择串口" style="width: 100%">
                            <el-option v-for="port in ports" :key="port.path"
                                :label="port.path + (port.description ? ` (${port.description})` : '')"
                                :value="port.path" />
                        </el-select>
                    </el-col>
                    <el-col :span="4" v-if="communicationType === 'serial'">
                        <el-button type="primary" @click="scanPorts">扫描串口</el-button>
                    </el-col>
                    <el-col :span="4" v-if="communicationType === 'serial'">
                        <el-select v-model="baudRate" placeholder="波特率">
                            <el-option v-for="rate in baudRates" :key="rate" :label="rate" :value="rate" />
                        </el-select>
                    </el-col>
                    <!-- UDP配置 -->
                    <el-col :span="6" v-if="communicationType === 'udp'">
                        <el-input v-model="udpConfig.localPort" placeholder="本地端口">
                            <template #prepend>本地端口</template>
                        </el-input>
                    </el-col>
                    <el-col :span="6" v-if="communicationType === 'udp'">
                        <el-input v-model="udpConfig.remoteIp" placeholder="远程IP">
                            <template #prepend>远程IP</template>
                        </el-input>
                    </el-col>
                    <el-col :span="6" v-if="communicationType === 'udp'">
                        <el-input v-model="udpConfig.remotePort" placeholder="远程端口">
                            <template #prepend>远程端口</template>
                        </el-input>
                    </el-col>
                    <!-- 连接按钮 -->
                    <el-col :span="4">
                        <el-button :type="isConnected ? 'danger' : 'success'" @click="toggleConnection">
                            {{ isConnected ? '断开连接' : '连接' }}
                        </el-button>
                    </el-col>
                    <el-col :span="4">
                        <el-button type="primary" @click="exportLogs">导出日志</el-button>
                    </el-col>
                </el-row>

                <el-row :gutter="20" class="mb-20">
                    <el-col :span="16">
                        <el-input v-model="hexCommand" placeholder="输入十六进制命令 (例如: AB CD 01 00 00 00 02 00 00)"
                            clearable>
                            <template #append>
                                <el-button @click="sendHexCommand" :disabled="!isConnected">发送</el-button>
                            </template>
                        </el-input>
                    </el-col>
                    <el-col :span="8">
                        <el-button 
                            :type="isRunning ? 'danger' : 'success'"
                            :loading="isWaitingResponse"
                            @click="handleCtrlCommand"
                            :disabled="!isConnected"
                        >
                            {{ isWaitingResponse ? '等待响应...' : (isRunning ? '停止' : '开始') }}
                        </el-button>
                    </el-col>
                </el-row>
                <el-row :gutter="20">
                    <el-col :span="24">
                        <div class="filter-bar">
                            <el-input v-model="searchText" placeholder="搜索日志" prefix-icon="el-icon-search" clearable
                                @clear="filterLogs" @input="filterLogs" style="width: 200px" />
                            <el-input-number v-model="pageSize" :min="1" :max="1000" placeholder="每页显示条数"
                                style="width: 120px" @change="handlePageSizeChange" />
                            <el-button size="small" @click="clearOutput">清空</el-button>
                            <el-button size="small" @click="showAboutDialog">关于</el-button>
                            <el-button size="small" @click="showTableConfig">表格设置</el-button>
                        </div>
                    </el-col>
                </el-row>
            </el-header>

            <el-main>
                <div class="serial-content">
                    <el-tabs type="border-card">
                        <el-tab-pane label="所有数据">
                            <div class="output-window">
                                <div class="log-table-container" ref="logContainer">
                                    <el-table :data="paginatedLogs" style="width: 100%" size="small" height="calc(100% - 50px)" border
                                        :style="{
                                            fontSize: tableConfig.fontSize + 'px',
                                            fontFamily: tableConfig.fontFamily
                                        }">
                                        <el-table-column prop="timestamp" label="Time" width="100" />
                                        <el-table-column prop="packetId" label="Packet" :width="tableConfig.columnWidths.packetId" resizable />
                                        <el-table-column prop="message" label="Message" :width="tableConfig.columnWidths.message" resizable />
                                        <el-table-column prop="slaveId" label="Slave ID" :width="tableConfig.columnWidths.slaveId" resizable />
                                        <el-table-column prop="deviceStatus" label="Device Status" :width="tableConfig.columnWidths.deviceStatus" resizable />
                                        <el-table-column prop="context" label="Payload" :width="tableConfig.columnWidths.context" resizable />
                                    </el-table>
                                    <div class="pagination-container">
                                        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                                            :page-sizes="pageSizes" :total="filteredLogs.length"
                                            layout="total, sizes, prev, pager, next, jumper" @size-change="handlePageSizeChange"
                                            @current-change="handleCurrentPageChange" />
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane label="导通数据">
                            <div class="output-window">
                                <div class="control-panel mb-20">
                                    <el-form inline>
                                        <el-form-item label="设备离线超时(ms)">
                                            <el-input-number 
                                                v-model="offlineTimeout"
                                                :min="1000"
                                                :max="60000"
                                                :step="1000"
                                                @change="checkDeviceStatus"
                                            />
                                        </el-form-item>
                                    </el-form>
                                </div>
                                <div class="log-table-container">
                                    <el-table :data="slave2BackendLogsArray" style="width: 100%" size="small" height="calc(100% - 50px)" border
                                        :style="{
                                            fontSize: tableConfig.fontSize + 'px',
                                            fontFamily: tableConfig.fontFamily
                                        }">
                                        <el-table-column prop="lastUpdate" label="Last Update" width="100" />
                                        <el-table-column prop="slaveId" label="Slave ID" :width="tableConfig.columnWidths.slaveId" resizable>
                                            <template #default="scope">
                                                <span :class="{ 'offline-device': scope.row.isOffline }">
                                                    {{ scope.row.slaveId }}
                                                </span>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="Device Status" align="center">
                                            <el-table-column prop="cs" label="CS" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.cs === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.cs }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="sl" label="SL" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.sl === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.sl }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="eub" label="EUB" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.eub === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.eub }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="bla" label="BLA" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.bla === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.bla }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="ps" label="PS" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.ps === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.ps }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="el1" label="EL1" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.el1 === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.el1 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="el2" label="EL2" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.el2 === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.el2 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="a1" label="A1" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.a1 === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.a1 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="a2" label="A2" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.a2 === '1' ? 'success' : 'danger'" size="small">
                                                        {{ scope.row.a2 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                        </el-table-column>
                                        <el-table-column prop="context" label="Conduction Data" :width="tableConfig.columnWidths.context" resizable />
                                    </el-table>
                                </div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </el-main>

            <!-- 关于对话框 -->
            <el-dialog v-model="aboutDialogVisible" title="关于" width="400px" align-center>
                <div class="about-content">
                    <h2>WhtsViewer</h2>
                    <p>版本：v{{ version }}</p>
                    <p>项目地址：<a href="#" @click="openLink('https://github.com/ylongwang2782/WhtsViewer')">GitHub</a></p>
                    <div class="about-features">
                        <h3>主要功能：</h3>
                        <ul>
                            <li>支持串口和UDP通信</li>
                            <li>支持Whts协议数据查看</li>
                            <li>支持十六进制命令发送</li>
                            <li>支持数据导出</li>
                            <li>支持自定义分页大小</li>
                            <li>支持数据搜索</li>
                        </ul>
                    </div>
                </div>
            </el-dialog>

            <!-- 表格配置对话框 -->
            <el-dialog v-model="tableConfigVisible" title="表格设置" width="500px">
                <div class="table-config">
                    <h3>列宽设置</h3>
                    <el-form label-width="100px">
                        <el-form-item label="时间戳宽度">
                            <el-input-number v-model="tableConfig.columnWidths.timestamp" :min="50" :max="300" />
                        </el-form-item>
                        <el-form-item label="Packet ID宽度">
                            <el-input-number v-model="tableConfig.columnWidths.packetId" :min="50" :max="200" />
                        </el-form-item>
                        <el-form-item label="Message宽度">
                            <el-input-number v-model="tableConfig.columnWidths.message" :min="100" :max="200" />
                        </el-form-item>
                        <el-form-item label="Slave ID宽度">
                            <el-input-number v-model="tableConfig.columnWidths.slaveId" :min="50" :max="200" />
                        </el-form-item>
                        <el-form-item label="Device Status宽度">
                            <el-input-number v-model="tableConfig.columnWidths.deviceStatus" :min="50" :max="200" />
                        </el-form-item>
                        <el-form-item label="Context宽度">
                            <el-input-number v-model="tableConfig.columnWidths.context" :min="100" :max="1000" />
                        </el-form-item>
                    </el-form>

                    <h3>字体设置</h3>
                    <el-form label-width="100px">
                        <el-form-item label="字体">
                            <el-select v-model="tableConfig.fontFamily">
                                <el-option label="默认" value="system-ui" />
                                <el-option label="等宽字体" value="monospace" />
                                <el-option label="微软雅黑" value="Microsoft YaHei" />
                                <el-option label="宋体" value="SimSun" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="字号">
                            <el-input-number v-model="tableConfig.fontSize" :min="12" :max="20" />
                        </el-form-item>
                    </el-form>
                </div>
            </el-dialog>
        </el-container>
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import packageInfo from '../package.json';  // 导入package.json获取版本号

export default {
    name: 'SerialPortAssistant',
    setup() {
        const ports = ref([]);
        const selectedPort = ref('');
        const baudRate = ref('115200');
        const inputText = ref('');
        const showHexOutput = ref(false);
        const sendHex = ref(false);
        const logContainer = ref(null);
        const searchText = ref('');
        const selectedLogLevel = ref('');
        const selectedTag = ref('');
        const dataBuffer = ref('');

        // 日志相关
        const logs = ref([]);
        const logLevels = ['V', 'D', 'I', 'W', 'E'];
        const availableTags = computed(() => {
            const tags = new Set();
            logs.value.forEach(log => tags.add(log.tag));
            return Array.from(tags);
        });

        const parseLog = (text) => {
            // 匹配格式：[timestamp] [level] [tag] content
            const match = text.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/);
            if (match) {
                return {
                    timestamp: match[1].trim(),  // 去除可能的空格
                    level: match[2].trim(),      // 去除可能的空格
                    tag: match[3].trim(),        // 去除可能的空格
                    content: match[4].trim()     // 去除可能的空格
                };
            }
            return null;
        };

        const filteredLogs = computed(() => {
            return logs.value.filter(log => {
                if (searchText.value) {
                    const searchLower = searchText.value.toLowerCase();
                    return log.context.toLowerCase().includes(searchLower);
                }
                return true;
            });
        });

        const filterLogs = () => {
            // 过滤后自动滚动到底部
            setTimeout(() => {
                if (logContainer.value) {
                    const table = logContainer.value.querySelector('.el-table__body-wrapper');
                    if (table) {
                        table.scrollTop = table.scrollHeight;
                    }
                }
            }, 100);
        };

        const baudRates = [
            '110', '300', '600', '1200', '2400', '4800', '9600',
            '14400', '19200', '38400', '57600', '115200', '128000', '256000', '460800', '500000', '512000', '600000', '750000', '921600', '1500000', '2000000'
        ];

        const scanPorts = async () => {
            try {
                ports.value = await window.electronAPI.listPorts();
            } catch (error) {
                ElMessage.error('扫描串口失败：' + error.message);
            }
        };

        // 通信方式选择
        const communicationType = ref('serial');
        const isConnected = ref(false);

        // 处理通信方式变更
        const handleCommunicationTypeChange = async () => {
            if (isConnected.value) {
                await disconnectCurrent();
            }
        };

        // 断开当前连接
        const disconnectCurrent = async () => {
            if (communicationType.value === 'serial') {
                await window.electronAPI.closePort();
            } else if (communicationType.value === 'udp') {
                await window.electronAPI.closeUdpSocket();
            }
            isConnected.value = false;
        };

        // 统一的连接/断开处理
        const toggleConnection = async () => {
            try {
                if (!isConnected.value) {
                    if (communicationType.value === 'serial') {
                        if (!selectedPort.value) {
                            ElMessage.warning('请选择串口');
                            return;
                        }

                        const result = await window.electronAPI.openPort({
                            path: selectedPort.value,
                            baudRate: baudRate.value
                        });

                        if (result.success) {
                            isConnected.value = true;
                            ElMessage.success('串口已打开');
                        } else {
                            ElMessage.error('打开串口失败：' + result.error);
                        }
                    } else if (communicationType.value === 'udp') {
                        // 验证输入
                        const localPort = parseInt(udpConfig.value.localPort);
                        const remotePort = parseInt(udpConfig.value.remotePort);

                        if (isNaN(localPort) || localPort <= 0 || localPort > 65535) {
                            ElMessage.error('本地端口必须是1-65535之间的数字');
                            return;
                        }

                        if (isNaN(remotePort) || remotePort <= 0 || remotePort > 65535) {
                            ElMessage.error('远程端口必须是1-65535之间的数字');
                            return;
                        }

                        // 验证IP地址
                        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                        if (!ipRegex.test(udpConfig.value.remoteIp)) {
                            ElMessage.error('请输入有效的IP地址');
                            return;
                        }

                        const result = await window.electronAPI.createUdpSocket({
                            localPort,
                            remoteIp: udpConfig.value.remoteIp,
                            remotePort
                        });

                        if (result.success) {
                            isConnected.value = true;
                            ElMessage.success('UDP已连接');
                        } else {
                            ElMessage.error('UDP连接失败：' + result.error);
                        }
                    }
                } else {
                    await disconnectCurrent();
                    ElMessage.success(communicationType.value === 'serial' ? '串口已关闭' : 'UDP已断开');
                }
            } catch (error) {
                ElMessage.error('操作失败：' + error.message);
            }
        };

        const clearOutput = () => {
            logs.value = [];
            currentPage.value = 1;  // 清空日志时重置页码
        };

        const processBuffer = () => {
            const data = new Uint8Array(Buffer.from(dataBuffer.value));
            const frame = parseWhtsFrame(data);

            if (frame) {
                logs.value.push({
                    timestamp: new Date().toLocaleTimeString(),
                    packetId: '0x' + frame.packetId.toString(16).toUpperCase(),
                    context: Array.from(frame.payload).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
                    rawData: frame.rawData
                });

                // 清除已处理的数据
                const processedLength = frame.length + 7;
                dataBuffer.value = dataBuffer.value.slice(processedLength);

                // 如果在最后一页，自动跳转到新的最后一页
                const maxPage = Math.ceil(filteredLogs.value.length / pageSize.value);
                if (currentPage.value === maxPage || currentPage.value === maxPage - 1) {
                    currentPage.value = Math.ceil(logs.value.length / pageSize.value);
                }
            }
        };

        // 添加Whts包类型映射
        const PACKET_TYPES = {
            0x00: 'Master2Slave',
            0x01: 'Slave2Master',
            0x02: 'Backend2Master',
            0x03: 'Master2Backend',
            0x04: 'Slave2Backend'
        };

        const getPacketTypeName = (packetId) => {
            return PACKET_TYPES[packetId] || `Unknown(0x${packetId.toString(16).toUpperCase()})`;
        };

        // 添加Master2Backend消息类型映射
        const MASTER2BACKEND_MSG_TYPES = {
            0x00: 'SLAVE_CFG_MSG',
            0x01: 'MODE_CFG_MSG',
            0x02: 'RST_MSG',
            0x03: 'CTRL_MSG',
            0x10: 'PING_RES_MSG'
        };

        const getMsgTypeName = (msgId) => {
            return MASTER2BACKEND_MSG_TYPES[msgId] || `Unknown(0x${msgId.toString(16).toUpperCase()})`;
        };

        // 添加Slave2Backend消息类型映射
        const SLAVE2BACKEND_MSG_TYPES = {
            0x00: 'CONDUCTION_DATA_MSG',
            0x01: 'RESISTANCE_DATA_MSG',
            0x02: 'CLIP_DATA_MSG'
        };

        // 添加Slave2Backend数据存储
        const slave2BackendLogs = ref(new Map()); // 使用Map来存储最新的Slave2Backend数据，key为SlaveId

        // 计算属性：将Map转换为数组以供表格使用
        const slave2BackendLogsArray = computed(() => {
            return Array.from(slave2BackendLogs.value.values());
        });

        // 添加设备状态位解析函数
        const parseDeviceStatus = (status) => {
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
        };

        // 添加设备掉线检测配置
        const offlineTimeout = ref(5000); // 默认5秒超时
        const deviceLastUpdateTime = ref(new Map()); // 存储每个设备的最后更新时间
        const deviceOnlineStatus = ref(new Map()); // 存储设备在线状态

        // 添加检测定时器
        let offlineCheckTimer = null;

        // 检查设备在线状态
        const checkDeviceStatus = () => {
            const now = Date.now();
            deviceLastUpdateTime.value.forEach((lastUpdate, slaveId) => {
                const isOnline = (now - lastUpdate) <= offlineTimeout.value;
                deviceOnlineStatus.value.set(slaveId, isOnline);
                
                // 如果设备离线，更新显示状态
                if (!isOnline && slave2BackendLogs.value.has(slaveId)) {
                    const currentData = slave2BackendLogs.value.get(slaveId);
                    slave2BackendLogs.value.set(slaveId, {
                        ...currentData,
                        isOffline: true
                    });
                }
            });
        };

        // 添加运行状态控制
        const isRunning = ref(false);
        const isWaitingResponse = ref(false);
        const responseTimeout = ref(null);

        // 修改控制命令处理
        const handleCtrlCommand = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                isWaitingResponse.value = true;
                const runningStatus = !isRunning.value ? 1 : 0; // 切换状态
                const ctrlCmd = new Uint8Array([0xAB, 0xCD, 0x02, 0x00, 0x00, 0x02, 0x00, 0x03, runningStatus]);
                
                await window.electronAPI.sendUdpData(ctrlCmd);
                
                // 设置响应超时
                if (responseTimeout.value) {
                    clearTimeout(responseTimeout.value);
                }
                
                responseTimeout.value = setTimeout(() => {
                    if (isWaitingResponse.value) {
                        isWaitingResponse.value = false;
                        ElMessage.error('主机响应超时');
                    }
                }, 3000); // 3秒超时
                
            } catch (error) {
                isWaitingResponse.value = false;
                ElMessage.error('发送失败：' + error.message);
            }
        };

        // 修改handleUdpData函数，添加对Master2Backend Ctrl Message的处理
        const handleUdpData = (event, { data }) => {
            console.log('UDP data received:', data);
            
            const whtsFrame = parseWhtsData(data);
            if (whtsFrame) {
                const logEntry = {
                    packetId: getPacketTypeName(whtsFrame.packetId),
                    message: whtsFrame.msgType || '--',
                    slaveId: whtsFrame.slaveId || '--',
                    deviceStatus: whtsFrame.deviceStatus || '--',
                    context: whtsFrame.msgType ? whtsFrame.msgPayload : whtsFrame.payload,
                    timestamp: new Date().toLocaleTimeString()
                };

                if (whtsFrame.packetId === 0x04) {
                    const deviceStatusBits = parseDeviceStatus(parseInt(whtsFrame.deviceStatus.slice(2), 16));
                    
                    // 更新设备最后通信时间
                    deviceLastUpdateTime.value.set(whtsFrame.slaveId, Date.now());
                    deviceOnlineStatus.value.set(whtsFrame.slaveId, true);
                    
                    slave2BackendLogs.value.set(whtsFrame.slaveId, {
                        ...logEntry,
                        lastUpdate: new Date().toLocaleTimeString(),
                        ...deviceStatusBits,
                        isOffline: false
                    });

                    // 对于CONDUCTION_DATA_MSG，更新而不是追加到主日志
                    if (whtsFrame.msgType === 'CONDUCTION_DATA_MSG') {
                        // 查找并更新现有的CONDUCTION_DATA_MSG条目
                        const existingIndex = logs.value.findIndex(log => 
                            log.slaveId === whtsFrame.slaveId && 
                            log.message === 'CONDUCTION_DATA_MSG'
                        );
                        
                        if (existingIndex !== -1) {
                            // 更新现有条目
                            logs.value[existingIndex] = logEntry;
                        } else {
                            // 如果不存在，则添加新条目
                            logs.value.push(logEntry);
                        }
                    } else {
                        // 其他类型的Slave2Backend消息正常添加
                        logs.value.push(logEntry);
                    }
                } else {
                    // 处理Master2Backend的Ctrl Message响应
                    if (whtsFrame.packetId === 0x03 && whtsFrame.msgType === 'CTRL_MSG' && isWaitingResponse.value) {
                        isWaitingResponse.value = false;
                        if (responseTimeout.value) {
                            clearTimeout(responseTimeout.value);
                        }

                        const payload = whtsFrame.msgPayload.split(' ');
                        if (payload.length >= 2) {
                            const status = parseInt(payload[0], 16);
                            const runningStatus = parseInt(payload[1], 16);

                            if (status === 0) { // 响应正常
                                isRunning.value = runningStatus === 1;
                                ElMessage.success(`主机已${isRunning.value ? '开启' : '停止'}`);
                            } else { // 响应异常
                                ElMessage.error('主机响应异常');
                            }
                        }
                    } else {
                        // 非Slave2Backend包正常添加到日志
                        logs.value.push(logEntry);
                    }
                }
            } else {
                const hexData = Array.from(new Uint8Array(data))
                    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ');
                
                logs.value.push({
                    packetId: 'Invalid Frame',
                    message: '--',
                    slaveId: '--',
                    deviceStatus: '--',
                    context: hexData,
                    timestamp: new Date().toLocaleTimeString()
                });
            }

            // 更新分页
            const maxPage = Math.ceil(filteredLogs.value.length / pageSize.value);
            if (currentPage.value === maxPage || currentPage.value === maxPage - 1) {
                currentPage.value = Math.ceil(logs.value.length / pageSize.value);
            }
        };

        // 修改parseWhtsData函数中解析Slave2Backend的部分
        const parseWhtsData = (data) => {
            const bytes = new Uint8Array(data);
            
            // 检查数据长度是否足够
            if (bytes.length < 7) {
                console.log('Data too short for Whts protocol');
                return null;
            }
            
            // 检查帧头
            if (bytes[0] !== 0xAB || bytes[1] !== 0xCD) {
                console.log('Invalid frame header');
                return null;
            }
            
            // 获取PacketID
            const packetId = bytes[2];
            
            // 获取数据长度（小端格式）
            const length = bytes[6] << 8 | bytes[5];
            
            // 检查数据长度是否合理
            if (length + 7 > bytes.length) {
                console.log('Invalid data length');
                return null;
            }

            // 解析消息
            let msgType = null;
            let msgPayload = null;
            let slaveId = null;
            let deviceStatus = null;
            
            if (packetId === 0x03 && length > 0) { // Master2Backend packet
                const messageId = bytes[7];
                msgType = getMsgTypeName(messageId);
                msgPayload = Array.from(bytes.slice(8, 7 + length))
                    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ');
            } else if (packetId === 0x04 && length >= 7) { // Slave2Backend packet
                const messageId = bytes[7];
                msgType = SLAVE2BACKEND_MSG_TYPES[messageId] || `Unknown(0x${messageId.toString(16).toUpperCase()})`;
                
                // 解析Slave ID (4字节，小端)
                slaveId = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
                
                // 解析Device Status (2字节)
                deviceStatus = bytes[12] | (bytes[13] << 8);
                
                if (messageId === 0x00) { // CONDUCTION_DATA_MSG
                    // 解析导通数据长度（2字节）
                    const conductionLength = bytes[14] | (bytes[15] << 8);
                    
                    // 只提取导通数据部分（不包含长度字段）
                    msgPayload = Array.from(bytes.slice(16, 14 + conductionLength + 2))
                        .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                        .join(' ');
                } else {
                    // 其他消息类型的处理保持不变
                    msgPayload = Array.from(bytes.slice(14, 7 + length))
                        .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                        .join(' ');
                }
            }
            
            // 提取完整Payload
            const payload = Array.from(bytes.slice(7, 7 + length))
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ');
            
            return {
                packetId,
                payload,
                msgType,
                msgPayload,
                slaveId: slaveId !== null ? `0x${slaveId.toString(16).toUpperCase()}` : null,
                deviceStatus: deviceStatus !== null ? `0x${deviceStatus.toString(16).toUpperCase()}` : null
            };
        };

        // 处理串口数据
        const handleSerialData = (event, data) => {
            // 将接收到的数据转换为十六进制字符串
            const hexData = Array.from(new Uint8Array(data))
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ');

            logs.value.push({
                packetId: '--',  // 不解析，直接显示占位符
                context: hexData // 直接显示原始数据
            });

            // 如果在最后一页，自动跳转到新的最后一页
            const maxPage = Math.ceil(filteredLogs.value.length / pageSize.value);
            if (currentPage.value === maxPage || currentPage.value === maxPage - 1) {
                currentPage.value = Math.ceil(logs.value.length / pageSize.value);
            }
        };

        const exportLogs = () => {
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const csvContent = filteredLogs.value.map(log =>
                `${log.timestamp},${log.level},${log.tag},"${log.content.replace(/"/g, '""')}"`
            ).join('\n');

            const header = 'Timestamp,Level,Tag,Content\n';
            const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `logs_${timestamp}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        };

        const pageSize = ref(50);  // 默认每页显示50条
        const currentPage = ref(1);
        const pageSizes = [20, 50, 100, 200, 500];  // 可选的每页显示数量

        const paginatedLogs = computed(() => {
            const start = (currentPage.value - 1) * pageSize.value;
            const end = start + pageSize.value;
            return filteredLogs.value.slice(start, end);
        });

        const handlePageSizeChange = (newSize) => {
            pageSize.value = newSize;
            // 当页大小改变时，可能需要调整当前页码以确保数据正确显示
            const maxPage = Math.ceil(filteredLogs.value.length / newSize);
            if (currentPage.value > maxPage) {
                currentPage.value = maxPage;
            }
        };

        const handleCurrentPageChange = (newPage) => {
            currentPage.value = newPage;
        };

        const aboutDialogVisible = ref(false);
        const version = ref(packageInfo.version);

        const showAboutDialog = () => {
            aboutDialogVisible.value = true;
        };

        const openLink = (url) => {
            window.electronAPI.openExternal(url);
        };

        const tableConfigVisible = ref(false);
        const tableConfig = ref({
            columnWidths: {
                packetId: 150,
                message: 150,
                slaveId: 100,
                deviceStatus: 100,
                context: 400
            },
            fontSize: 14,
            fontFamily: 'monospace'
        });

        // 从localStorage加载表格配置
        const loadTableConfig = () => {
            const savedConfig = localStorage.getItem('tableConfig');
            if (savedConfig) {
                tableConfig.value = JSON.parse(savedConfig);
            }
        };

        // 保存表格配置到localStorage
        const saveTableConfig = () => {
            localStorage.setItem('tableConfig', JSON.stringify(tableConfig.value));
        };

        const showTableConfig = () => {
            tableConfigVisible.value = true;
        };

        // 监听表格配置变化并保存
        watch(tableConfig, () => {
            saveTableConfig();
        }, { deep: true });

        // 添加十六进制命令相关
        const hexCommand = ref('');
        const sendHexCommand = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            // 验证和处理十六进制命令
            const hexString = hexCommand.value.replace(/\s+/g, '');
            if (!/^[0-9A-Fa-f]+$/.test(hexString)) {
                ElMessage.error('请输入有效的十六进制命令');
                return;
            }

            try {
                const hexArray = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

                if (communicationType.value === 'serial') {
                    await window.electronAPI.writePort(hexArray);
                } else if (communicationType.value === 'udp') {
                    await window.electronAPI.sendUdpData(hexArray);
                }

                ElMessage.success('命令已发送');
            } catch (error) {
                ElMessage.error('发送失败：' + error.message);
            }
        };

        // Whts 协议解析
        const parseWhtsFrame = (data) => {
            if (data.length < 7) { // 最小帧长度：帧头(2) + PacketID(1) + Sequence(1) + Flag(1) + Length(2)
                return null;
            }

            // 查找帧头
            let frameStart = -1;
            for (let i = 0; i < data.length - 1; i++) {
                if (data[i] === 0xAB && data[i + 1] === 0xCD) {
                    frameStart = i;
                    break;
                }
            }

            if (frameStart === -1) {
                return null;
            }

            // 确保有足够的数据来读取长度字段
            if (frameStart + 6 >= data.length) {
                return null;
            }

            const frame = {
                packetId: data[frameStart + 2],
                sequence: data[frameStart + 3],
                moreFragments: data[frameStart + 4],
                length: (data[frameStart + 5] << 8) | data[frameStart + 6],
                payload: ''
            };

            // 验证数据长度
            const totalLength = frameStart + 7 + frame.length;
            if (totalLength > data.length) {
                return null;
            }

            // 提取payload并转换为十六进制字符串
            const payloadArray = Array.from(data.slice(frameStart + 7, totalLength));
            frame.payload = payloadArray.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');

            return frame;
        };

        // UDP相关
        const udpConfig = ref({
            localPort: '8080',
            remoteIp: '192.168.0.2',
            remotePort: '8080'
        });

        onMounted(() => {
            scanPorts();
            window.electronAPI.onSerialData(handleSerialData);
            window.electronAPI.onUdpData(handleUdpData);
            loadTableConfig();
            offlineCheckTimer = setInterval(checkDeviceStatus, 1000); // 每秒检查一次
        });

        onUnmounted(() => {
            window.electronAPI.removeSerialDataListener();
            window.electronAPI.removeUdpDataListener();
            if (offlineCheckTimer) {
                clearInterval(offlineCheckTimer);
            }
        });

        return {
            ports,
            selectedPort,
            baudRate,
            baudRates,
            inputText,
            showHexOutput,
            sendHex,
            scanPorts,
            toggleConnection,
            clearOutput,
            logContainer,
            filteredLogs,
            searchText,
            selectedLogLevel,
            selectedTag,
            logLevels,
            availableTags,
            filterLogs,
            exportLogs,
            pageSize,
            currentPage,
            pageSizes,
            paginatedLogs,
            handlePageSizeChange,
            handleCurrentPageChange,
            aboutDialogVisible,
            showAboutDialog,
            openLink,
            version,
            tableConfigVisible,
            tableConfig,
            showTableConfig,
            hexCommand,
            sendHexCommand,
            udpConfig,
            communicationType,
            handleCommunicationTypeChange,
            isConnected,
            handleSerialData,
            handleUdpData,
            slave2BackendLogs,
            slave2BackendLogsArray,
            offlineTimeout,
            deviceOnlineStatus,
            isRunning,
            isWaitingResponse,
            handleCtrlCommand
        };
    }
};
</script>

<style>
.serial-port-assistant {
    position: fixed;
    /* 使用固定定位铺满整个窗口 */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.el-container {
    height: 100%;
    padding: 20px;
}

/* 添加全局样式 */
:deep(html),
:deep(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
}

:deep(#app) {
    height: 100%;
    overflow: hidden;
}

.el-header {
    padding: 0 0 20px 0 !important;
    height: auto !important;
    flex-shrink: 0;
}

.el-main {
    padding: 0 !important;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.mb-20 {
    margin-bottom: 20px;
}

.serial-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* 重要：允许flex子项收缩 */
}

.output-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* 重要：允许flex子项收缩 */
}

.filter-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.log-table-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    /* 重要：允许flex子项收缩 */
}

.el-textarea {
    margin-bottom: 10px;
}

/* 日志等级颜色 */
.log-level-v {
    color: #909399;
}

.log-level-d {
    color: #409EFF;
}

.log-level-i {
    color: #67C23A;
}

.log-level-w {
    color: #E6A23C;
}

.log-level-e {
    color: #F56C6C;
}

/* 表格样式优化 */
.el-table {
    height: 100% !important;
}

.el-table .el-table__body-wrapper {
    overflow-y: auto;
}

.el-table__column-resize-proxy {
    background-color: #409EFF;
}

.pagination-container {
    padding: 10px;
    background: #fff;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #EBEEF5;
}

.log-table-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.el-table {
    flex: 1;
    overflow: hidden;
}

/* 确保分页控件不会被表格遮挡 */
.el-pagination {
    margin-top: 10px;
    padding: 0;
    z-index: 1;
}

.about-content {
    text-align: center;
    padding: 20px;
}

.about-content h2 {
    margin-bottom: 20px;
    color: #409EFF;
}

.about-content p {
    margin: 10px 0;
    color: #606266;
}

.about-content a {
    color: #409EFF;
    text-decoration: none;
}

.about-content a:hover {
    text-decoration: underline;
}

.about-features {
    text-align: left;
    margin-top: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
}

.about-features h3 {
    color: #303133;
    margin-bottom: 10px;
}

.about-features ul {
    list-style-type: none;
    padding-left: 0;
}

.about-features li {
    margin: 8px 0;
    color: #606266;
    position: relative;
    padding-left: 20px;
}

.about-features li:before {
    content: "•";
    color: #409EFF;
    position: absolute;
    left: 0;
}

.table-config {
    padding: 20px;
}

.table-config h3 {
    margin: 20px 0 10px;
    color: #409EFF;
    font-size: 16px;
}

.table-config .el-form {
    margin-top: 15px;
}

.el-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.el-tabs__content {
    flex: 1;
    overflow: hidden;
}

.el-tab-pane {
    height: 100%;
}

.el-tag--small {
    margin: 0;
    padding: 0 2px;
}

.offline-device {
    color: #F56C6C;
    font-weight: bold;
}

.control-panel {
    background-color: #fff;
    padding: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}
</style>