<template>
    <div class="serial-port-assistant">
        <el-container>
            <el-header>
                <el-row :gutter="20" class="mb-20">
                    <el-col :span="4">
                        <el-select v-model="communicationType" placeholder="通信方式" @change="handleCommunicationTypeChange">
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
                        <el-input
                            v-model="hexCommand"
                            placeholder="输入十六进制命令 (例如: AB CD 01 00 00 00 02 00 00)"
                            clearable
                        >
                            <template #append>
                                <el-button @click="sendHexCommand" :disabled="!isConnected">发送</el-button>
                            </template>
                        </el-input>
                    </el-col>
                </el-row>
                <el-row :gutter="20">
                    <el-col :span="24">
                        <div class="filter-bar">
                            <el-input v-model="searchText" placeholder="搜索日志" prefix-icon="el-icon-search" clearable
                                @clear="filterLogs" @input="filterLogs" style="width: 200px" />
                            <el-input-number 
                                v-model="pageSize" 
                                :min="1" 
                                :max="1000"
                                placeholder="每页显示条数"
                                style="width: 120px"
                                @change="handlePageSizeChange"
                            />
                            <el-button size="small" @click="clearOutput">清空</el-button>
                            <el-button size="small" @click="showAboutDialog">关于</el-button>
                            <el-button size="small" @click="showTableConfig">表格设置</el-button>
                        </div>
                    </el-col>
                </el-row>
            </el-header>

            <el-main>
                <div class="serial-content">
                    <div class="output-window">
                        <div class="log-table-container" ref="logContainer">
                            <el-table 
                                :data="paginatedLogs" 
                                style="width: 100%" 
                                size="small" 
                                height="100%" 
                                border
                                :style="{
                                    fontSize: tableConfig.fontSize + 'px',
                                    fontFamily: tableConfig.fontFamily
                                }"
                            >
                                <el-table-column 
                                    prop="packetId" 
                                    label="Packet ID" 
                                    :width="tableConfig.columnWidths.packetId"
                                    resizable
                                />
                                <el-table-column 
                                    prop="context" 
                                    label="Payload" 
                                    :width="tableConfig.columnWidths.context"
                                    resizable 
                                />
                            </el-table>
                            <div class="pagination-container">
                                <el-pagination
                                    v-model:current-page="currentPage"
                                    v-model:page-size="pageSize"
                                    :page-sizes="pageSizes"
                                    :total="filteredLogs.length"
                                    layout="total, sizes, prev, pager, next, jumper"
                                    @size-change="handlePageSizeChange"
                                    @current-change="handleCurrentPageChange"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </el-main>

            <!-- 关于对话框 -->
            <el-dialog
                v-model="aboutDialogVisible"
                title="关于"
                width="400px"
                align-center
            >
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
            <el-dialog
                v-model="tableConfigVisible"
                title="表格设置"
                width="500px"
            >
                <div class="table-config">
                    <h3>列宽设置</h3>
                    <el-form label-width="100px">
                        <el-form-item label="时间戳宽度">
                            <el-input-number 
                                v-model="tableConfig.columnWidths.timestamp" 
                                :min="50" 
                                :max="300"
                            />
                        </el-form-item>
                        <el-form-item label="Packet ID宽度">
                            <el-input-number 
                                v-model="tableConfig.columnWidths.packetId" 
                                :min="50" 
                                :max="200"
                            />
                        </el-form-item>
                        <el-form-item label="Context宽度">
                            <el-input-number 
                                v-model="tableConfig.columnWidths.context" 
                                :min="100" 
                                :max="1000"
                            />
                        </el-form-item>
                        <el-form-item label="Raw Data宽度">
                            <el-input-number 
                                v-model="tableConfig.columnWidths.rawData" 
                                :min="100" 
                                :max="1000"
                            />
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
                            <el-input-number 
                                v-model="tableConfig.fontSize" 
                                :min="12" 
                                :max="20"
                            />
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

        // 处理UDP数据
        const handleUdpData = (event, { data }) => {
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
                packetId: 100,
                context: 800
            },
            fontSize: 14,
            fontFamily: 'monospace' // 使用等宽字体以便对齐十六进制数据
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
        });

        onUnmounted(() => {
            window.electronAPI.removeSerialDataListener();
            window.electronAPI.removeUdpDataListener();
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
            handleUdpData
        };
    }
};
</script>

<style>
.serial-port-assistant {
    position: fixed;  /* 使用固定定位铺满整个窗口 */
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
    min-height: 0; /* 重要：允许flex子项收缩 */
}

.output-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* 重要：允许flex子项收缩 */
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
    min-height: 0; /* 重要：允许flex子项收缩 */
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
</style>