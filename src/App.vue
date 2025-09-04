<template>
    <div class="serial-port-assistant">
        <el-container>
            <el-header>
                <el-row :gutter="20" class="mb-20">
                    <el-col :span="4">
                        <el-select v-model="communicationType" placeholder="通信方式"
                            @change="handleCommunicationTypeChange">
                            <el-option label="UDP" value="udp" />
                            <el-option label="串口" value="serial" />
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
                    <el-col :span="6">
                        <el-select v-model="detectionMode" placeholder="选择检测模式" :disabled="!isConnected">
                            <el-option label="导通检测模式" value="0" />
                            <el-option label="阻值检测模式" value="1" />
                            <el-option label="卡钉检测模式" value="2" />
                        </el-select>
                    </el-col>
                    <el-col :span="4">
                        <el-button type="primary" :loading="isWaitingModeResponse" @click="switchDetectionMode" :disabled="!isConnected">
                            {{ isWaitingModeResponse ? '切换中...' : '切换模式' }}
                        </el-button>
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
                    <el-col :span="4">
                        <el-button type="success" @click="sendStartCommand" :disabled="!isConnected">
                            开始
                        </el-button>
                    </el-col>
                    <el-col :span="4">
                        <el-button type="danger" @click="sendStopCommand" :disabled="!isConnected">
                            停止
                        </el-button>
                    </el-col>
                </el-row>
            </el-header>

            <el-main>
                <div class="serial-content">
                    <el-tabs type="border-card">
                        <el-tab-pane label="所有数据">
                            <div class="output-window">
                                <div class="filter-bar mb-20">
                                    <el-input v-model="searchText" placeholder="搜索日志" prefix-icon="el-icon-search" clearable
                                        @clear="filterLogs" @input="filterLogs" style="width: 200px" />
                                    <el-input-number v-model="pageSize" :min="1" :max="1000" placeholder="每页显示条数"
                                        style="width: 120px" @change="handlePageSizeChange" />
                                    <el-button size="small" @click="clearOutput">清空</el-button>
                                    <el-button size="small" @click="showAboutDialog">关于</el-button>
                                    <el-button size="small" @click="showTableConfig">表格设置</el-button>
                                </div>
                                <div class="log-table-container" ref="logContainer">
                                    <el-table :data="paginatedLogs" style="width: 100%" size="small"
                                        height="calc(100% - 50px)" border :style="{
                                            fontSize: tableConfig.fontSize + 'px',
                                            fontFamily: tableConfig.fontFamily
                                        }">
                                        <el-table-column prop="timestamp" label="Time" width="100" />
                                        <el-table-column prop="packetId" label="Packet"
                                            :width="tableConfig.columnWidths.packetId" resizable />
                                        <el-table-column prop="message" label="Message"
                                            :width="tableConfig.columnWidths.message" resizable />
                                        <el-table-column prop="slaveId" label="Slave ID"
                                            :width="tableConfig.columnWidths.slaveId" resizable />
                                        <el-table-column prop="deviceStatus" label="Device Status"
                                            :width="tableConfig.columnWidths.deviceStatus" resizable />
                                        <el-table-column prop="context" label="Payload"
                                            :width="tableConfig.columnWidths.context" resizable />
                                    </el-table>
                                    <div class="pagination-container">
                                        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                                            :page-sizes="pageSizes" :total="filteredLogs.length"
                                            layout="total, sizes, prev, pager, next, jumper"
                                            @size-change="handlePageSizeChange"
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
                                            <el-input-number v-model="offlineTimeout" :min="1000" :max="60000"
                                                :step="1000" @change="checkDeviceStatus" />
                                        </el-form-item>
                                        <el-form-item>
                                            <el-button size="small" type="danger" @click="clearConductionData">清空数据</el-button>
                                        </el-form-item>
                                    </el-form>
                                </div>
                                <div class="log-table-container">
                                    <el-table :data="slave2BackendLogsArray" style="width: 100%" size="small"
                                        height="calc(100% - 50px)" border :style="{
                                            fontSize: tableConfig.fontSize + 'px',
                                            fontFamily: tableConfig.fontFamily
                                        }">
                                        <el-table-column prop="lastUpdate" label="Last Update" width="100" />
                                        <el-table-column prop="slaveId" label="Slave ID"
                                            :width="tableConfig.columnWidths.slaveId" resizable>
                                            <template #default="scope">
                                                <span :class="{ 'offline-device': scope.row.isOffline }">
                                                    {{ scope.row.slaveId }}
                                                </span>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="Device Status" align="center">
                                            <el-table-column prop="cs" label="CS" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.cs === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.cs }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="sl" label="SL" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.sl === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.sl }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="eub" label="EUB" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.eub === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.eub }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="bla" label="BLA" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.bla === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.bla }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="ps" label="PS" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.ps === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.ps }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="el1" label="EL1" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.el1 === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.el1 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="el2" label="EL2" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.el2 === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.el2 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="a1" label="A1" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.a1 === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.a1 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="a2" label="A2" width="40" align="center">
                                                <template #default="scope">
                                                    <el-tag :type="scope.row.a2 === '1' ? 'success' : 'danger'"
                                                        size="small">
                                                        {{ scope.row.a2 }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                        </el-table-column>
                                        <el-table-column prop="context" label="Conduction Data"
                                            :width="tableConfig.columnWidths.context" resizable />
                                    </el-table>
                                </div>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane label="从机配置">
                            <div class="config-management-container">
                                <div class="config-header mb-20">
                                    <el-row :gutter="20">
                                        <el-col :span="4">
                                            <el-button type="primary" @click="showNewConfigDialog">新建配置</el-button>
                                        </el-col>
                                        <el-col :span="8">
                                            <div class="interval-config">
                                                <span>间隔配置：</span>
                                                <el-input-number v-model="intervalConfig.intervalMs" :min="1" :max="255" 
                                                    placeholder="间隔时间" style="width: 120px" />
                                                <span style="margin: 0 5px;">ms</span>
                                                <el-button size="small" type="primary" :loading="isWaitingIntervalResponse"
                                                    @click="sendIntervalConfig" :disabled="!isConnected">
                                                    {{ isWaitingIntervalResponse ? '发送中...' : '发送' }}
                                                </el-button>
                                            </div>
                                        </el-col>
                                    </el-row>
                                </div>
                                <div class="config-table-container">
                                    <el-table :data="slaveConfigs" style="width: 100%" border>
                                        <el-table-column prop="name" label="配置名称" />
                                        <el-table-column label="从机数量" width="100">
                                            <template #default="scope">
                                                {{ scope.row.slaves.length }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="从机配置" min-width="300">
                                            <template #default="scope">
                                                <div v-for="(slave, index) in scope.row.slaves" :key="index"
                                                    class="slave-config-info">
                                                    从机{{ index + 1 }}: ID={{ slave.id }},
                                                    导通={{ slave.conductionNum }},
                                                    阻值={{ slave.resistanceNum }},
                                                    卡钉模式={{ slave.clipMode }},
                                                    卡钉状态={{ slave.clipStatus }}
                                                </div>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="200" fixed="right">
                                            <template #default="scope">
                                                <el-button size="small" :loading="isWaitingConfigResponse"
                                                    @click="sendSlaveConfig(scope.row)">
                                                    {{ isWaitingConfigResponse ? '等待响应...' : '发送' }}
                                                </el-button>
                                                <el-button size="small" type="primary" @click="editConfig(scope.row)">
                                                    编辑
                                                </el-button>
                                                <el-button size="small" type="danger"
                                                    @click="deleteConfig(scope.$index)">
                                                    删除
                                                </el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </div>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane label="从机复位">
                            <div class="reset-management-container">
                                <div class="reset-header mb-20">
                                    <el-button type="primary" @click="showNewResetDialog">新建复位配置</el-button>
                                </div>
                                <div class="reset-table-container">
                                    <el-table :data="resetConfigs" style="width: 100%" border>
                                        <el-table-column prop="name" label="配置名称" />
                                        <el-table-column label="从机数量" width="100">
                                            <template #default="scope">
                                                {{ scope.row.slaves.length }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="从机配置" min-width="400">
                                            <template #default="scope">
                                                <div v-for="(slave, index) in scope.row.slaves" :key="index"
                                                    class="reset-config-info">
                                                    从机{{ index + 1 }}: ID={{ slave.id }},
                                                    锁状态={{ slave.lock === '1' ? '上锁' : '解锁' }},
                                                    复位卡钉=0x{{ slave.clipStatus }}
                                                </div>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="200" fixed="right">
                                            <template #default="scope">
                                                <el-button size="small" :loading="isWaitingResetResponse"
                                                    @click="sendSlaveReset(scope.row)">
                                                    {{ isWaitingResetResponse ? '等待响应...' : '发送' }}
                                                </el-button>
                                                <el-button size="small" type="primary" @click="editResetConfig(scope.row)">
                                                    编辑
                                                </el-button>
                                                <el-button size="small" type="danger"
                                                    @click="deleteResetConfig(scope.$index)">
                                                    删除
                                                </el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </div>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane label="从机查询">
                            <div class="device-query-container">
                                <div class="query-header mb-20">
                                    <el-row :gutter="20">
                                        <el-col :span="4">
                                            <el-button type="primary" @click="queryDeviceList">查询设备列表</el-button>
                                        </el-col>
                                        <el-col :span="4">
                                            <el-button type="danger" @click="clearDeviceList" :disabled="!isConnected">清除设备列表</el-button>
                                        </el-col>
                                        <el-col :span="16">
                                            <div class="ping-config">
                                                <span>Ping配置：</span>
                                                <el-input-number v-model="pingConfig.count" :min="1" :max="1000" 
                                                    placeholder="次数" style="width: 200px" />
                                                <span style="margin: 0 10px;">次，间隔</span>
                                                <el-input-number v-model="pingConfig.interval" :min="5" :max="5000" :step="100"
                                                    placeholder="间隔" style="width: 200px" />
                                                <span style="margin-left: 5px;">ms</span>
                                            </div>
                                        </el-col>
                                    </el-row>
                                </div>
                                <div class="device-table-container">
                                    <el-table :data="deviceList" style="width: 100%" border>
                                        <el-table-column prop="deviceId" label="设备ID" width="150">
                                            <template #default="scope">
                                                {{ scope.row.deviceId.toUpperCase() }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="shortId" label="短ID" width="100">
                                            <template #default="scope">
                                                0x{{ scope.row.shortId.toString(16).padStart(2, '0').toUpperCase() }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="online" label="在线状态" width="100">
                                            <template #default="scope">
                                                <el-tag :type="scope.row.online ? 'success' : 'danger'">
                                                    {{ scope.row.online ? '在线' : '离线' }}
                                                </el-tag>
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="version" label="固件版本" width="150">
                                            <template #default="scope">
                                                v{{ scope.row.versionMajor }}.{{ scope.row.versionMinor }}.{{
                                                    scope.row.versionPatch }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="最后更新时间" width="200">
                                            <template #default="scope">
                                                {{ scope.row.lastUpdate }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="Ping测试" width="200">
                                            <template #default="scope">
                                                <el-button size="small" type="primary" 
                                                    :loading="scope.row.isPinging"
                                                    :disabled="!scope.row.online || !isConnected"
                                                    @click="startPingTest(scope.row)">
                                                    {{ scope.row.isPinging ? 'Ping中...' : 'Ping测试' }}
                                                </el-button>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="测试结果" min-width="250">
                                            <template #default="scope">
                                                <div v-if="scope.row.pingResult" class="ping-result">
                                                    <el-tag :type="getPingResultType(scope.row.pingResult.successRate)">
                                                        {{ scope.row.pingResult.successCount }}/{{ scope.row.pingResult.totalCount }}
                                                        ({{ scope.row.pingResult.successRate }})
                                                    </el-tag>
                                                    <span class="ping-time">{{ scope.row.pingResult.testTime }}</span>
                                                </div>
                                                <span v-else class="no-result">--</span>
                                            </template>
                                        </el-table-column>
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

            <!-- UDP配置对话框 -->
            <el-dialog v-model="udpConfigDialogVisible" title="UDP配置" width="400px" align-center>
                <el-form :model="udpConfig" label-width="100px">
                    <el-form-item label="本地端口" :rules="[
                        { required: true, message: '请输入本地端口' },
                        { type: 'number', min: 1, max: 65535, message: '端口范围: 1-65535' }
                    ]">
                        <el-input-number v-model="udpConfig.localPort" :min="1" :max="65535" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="远程IP" :rules="[
                        { required: true, message: '请输入远程IP地址' },
                        { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的IP地址' }
                    ]">
                        <el-input v-model="udpConfig.remoteIp" placeholder="例如: 192.168.1.100" />
                    </el-form-item>
                    <el-form-item label="远程端口" :rules="[
                        { required: true, message: '请输入远程端口' },
                        { type: 'number', min: 1, max: 65535, message: '端口范围: 1-65535' }
                    ]">
                        <el-input-number v-model="udpConfig.remotePort" :min="1" :max="65535" style="width: 100%" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="udpConfigDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveUdpConfig">保存并连接</el-button>
                </template>
            </el-dialog>

            <!-- 从机复位配置对话框 -->
            <el-dialog v-model="resetDialogVisible" title="从机复位配置管理" width="80%">
                <el-form :model="currentResetConfig" label-width="120px">
                    <el-form-item label="配置名称">
                        <el-input v-model="currentResetConfig.name" placeholder="请输入配置名称" />
                    </el-form-item>

                    <div v-for="(slave, index) in currentResetConfig.slaves" :key="index" class="slave-config-item">
                        <el-divider>从机 {{ index + 1 }}</el-divider>
                        <el-row :gutter="20">
                            <el-col :span="8">
                                <el-form-item :label="'从机ID'" :rules="[
                                    { required: true, message: '请输入从机ID' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 8)) {
                                                callback(new Error('请输入8位十六进制数（例如：46733B4E）'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.id" placeholder="8位十六进制数（例如：46733B4E）"
                                        @input="value => slave.id = value.toUpperCase()" maxlength="8" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="6">
                                <el-form-item label="锁状态" :rules="[
                                    { required: true, message: '请选择锁状态' }
                                ]">
                                    <el-select v-model="slave.lock" placeholder="选择锁状态">
                                        <el-option label="解锁" value="0" />
                                        <el-option label="上锁" value="1" />
                                    </el-select>
                                </el-form-item>
                            </el-col>
                            <el-col :span="6">
                                <el-form-item label="复位卡钉" :rules="[
                                    { required: true, message: '请输入复位卡钉孔位' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 4)) {
                                                callback(new Error('请输入4位十六进制数'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.clipStatus" placeholder="4位十六进制数（例如：FFFF）"
                                        @input="value => slave.clipStatus = value.toUpperCase()" maxlength="4" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-button type="danger" @click="removeResetSlave(index)"
                                    :disabled="currentResetConfig.slaves.length === 1">
                                    删除从机
                                </el-button>
                            </el-col>
                        </el-row>
                    </div>

                    <el-button type="primary" @click="addResetSlave">添加从机</el-button>
                </el-form>
                <template #footer>
                    <el-button @click="resetDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveResetConfig">保存配置</el-button>
                </template>
            </el-dialog>

            <!-- 从机配置对话框 -->
            <el-dialog v-model="configDialogVisible" title="从机配置管理" width="80%">
                <el-form :model="currentConfig" label-width="120px">
                    <el-form-item label="配置名称">
                        <el-input v-model="currentConfig.name" placeholder="请输入配置名称" />
                    </el-form-item>

                    <div v-for="(slave, index) in currentConfig.slaves" :key="index" class="slave-config-item">
                        <el-divider>从机 {{ index + 1 }}</el-divider>
                        <el-row :gutter="20">
                            <el-col :span="8">
                                <el-form-item :label="'从机ID'" :rules="[
                                    { required: true, message: '请输入从机ID' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 8)) {
                                                callback(new Error('请输入8位十六进制数（例如：46733B4E）'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.id" placeholder="8位十六进制数（例如：46733B4E）"
                                        @input="value => slave.id = value.toUpperCase()" maxlength="8" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-form-item label="导通检测数量" :rules="[
                                    { required: true, message: '请输入导通检测数量' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 2)) {
                                                callback(new Error('请输入2位十六进制数'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.conductionNum" placeholder="2位十六进制数"
                                        @input="value => slave.conductionNum = value.toUpperCase()" maxlength="2" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-form-item label="阻值检测数量" :rules="[
                                    { required: true, message: '请输入阻值检测数量' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 2)) {
                                                callback(new Error('请输入2位十六进制数'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.resistanceNum" placeholder="2位十六进制数"
                                        @input="value => slave.resistanceNum = value.toUpperCase()" maxlength="2" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-form-item label="卡钉检测模式" :rules="[
                                    { required: true, message: '请输入卡钉检测模式' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 2)) {
                                                callback(new Error('请输入2位十六进制数'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.clipMode" placeholder="2位十六进制数"
                                        @input="value => slave.clipMode = value.toUpperCase()" maxlength="2" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-form-item label="卡钉初始化状态" :rules="[
                                    { required: true, message: '请输入卡钉初始化状态' },
                                    {
                                        validator: (rule, value, callback) => {
                                            if (!validateHex(value, 4)) {
                                                callback(new Error('请输入4位十六进制数'));
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]">
                                    <el-input v-model="slave.clipStatus" placeholder="4位十六进制数"
                                        @input="value => slave.clipStatus = value.toUpperCase()" maxlength="4" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-button type="danger" @click="removeSlave(index)"
                            :disabled="currentConfig.slaves.length === 1">
                            删除从机
                        </el-button>
                    </div>

                    <el-button type="primary" @click="addSlave">添加从机</el-button>
                </el-form>
                <template #footer>
                    <el-button @click="configDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveConfig">保存配置</el-button>
                </template>
            </el-dialog>
        </el-container>
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import packageInfo from '../package.json';  // 导入package.json获取版本号
import { whtsBackend } from './protocol/whts-backend.js';  // 导入协议库

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
        const communicationType = ref('udp');
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
                        // UDP模式下，显示配置弹出框
                        showUdpConfigDialog();
                        return;
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

        const clearConductionData = () => {
            slave2BackendLogs.value.clear();
            ElMessage.success('导通数据已清空');
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

        // 协议相关的常量和函数现在通过协议库提供

        // 添加Slave2Backend数据存储
        const slave2BackendLogs = ref(new Map()); // 使用Map来存储最新的Slave2Backend数据，key为SlaveId

        // 计算属性：将Map转换为数组以供表格使用
        const slave2BackendLogsArray = computed(() => {
            return Array.from(slave2BackendLogs.value.values());
        });

        // 设备状态位解析函数现在通过协议库提供

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

        // 发送开始命令
        const sendStartCommand = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const ctrlCmd = whtsBackend.createCtrlMessage(1); // 开始状态
                await window.electronAPI.sendUdpData(ctrlCmd);
                ElMessage.success('开始命令已发送');
                isRunning.value = true; // 直接更新状态，不等待响应
            } catch (error) {
                ElMessage.error('发送开始命令失败：' + error.message);
            }
        };

        // 发送停止命令
        const sendStopCommand = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const ctrlCmd = whtsBackend.createCtrlMessage(0); // 停止状态
                await window.electronAPI.sendUdpData(ctrlCmd);
                ElMessage.success('停止命令已发送');
                isRunning.value = false; // 直接更新状态，不等待响应
            } catch (error) {
                ElMessage.error('发送停止命令失败：' + error.message);
            }
        };

        // 修改handleUdpData函数，使用协议库
        const handleUdpData = (event, { data }) => {
            console.log('UDP data received:', data);

            const parsedData = whtsBackend.parseReceivedData(data);
            
            // 构建日志条目
            const logEntry = {
                packetId: parsedData.packetType,
                message: parsedData.message,
                slaveId: parsedData.slaveId,
                deviceStatus: parsedData.deviceStatus,
                context: parsedData.payload,
                timestamp: parsedData.timestamp
            };

            // 处理Slave2Backend消息
            if (whtsBackend.isSlave2BackendMessage(parsedData)) {
                const slaveId = whtsBackend.getSlaveId(parsedData);
                const deviceStatusBits = whtsBackend.getDeviceStatusBits(parsedData);

                if (deviceStatusBits) {
                    // 更新设备最后通信时间
                    deviceLastUpdateTime.value.set(slaveId, Date.now());
                    deviceOnlineStatus.value.set(slaveId, true);

                    slave2BackendLogs.value.set(slaveId, {
                        ...logEntry,
                        lastUpdate: new Date().toLocaleTimeString(),
                        ...deviceStatusBits,
                        isOffline: false
                    });

                    // 对于导通数据消息，更新而不是追加到主日志
                    if (whtsBackend.isConductionDataMessage(parsedData)) {
                        const existingIndex = logs.value.findIndex(log =>
                            log.slaveId === slaveId &&
                            log.message === 'CONDUCTION_DATA_MSG'
                        );

                        if (existingIndex !== -1) {
                            logs.value[existingIndex] = logEntry;
                        } else {
                            logs.value.push(logEntry);
                        }
                    } else {
                        logs.value.push(logEntry);
                    }
                }
            } 
            else if (whtsBackend.isSlaveConfigResponse(parsedData) && isWaitingConfigResponse.value) {
                isWaitingConfigResponse.value = false;
                if (configResponseTimeout.value) {
                    clearTimeout(configResponseTimeout.value);
                }

                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg) {
                    if (parsedMsg.status === 0) {
                        ElMessage.success('配置已成功应用');
                    } else {
                        ElMessage.error('配置应用失败');
                    }
                }
            } 
            else if (whtsBackend.isSlaveResetResponse(parsedData) && isWaitingResetResponse.value) {
                isWaitingResetResponse.value = false;
                if (resetResponseTimeout.value) {
                    clearTimeout(resetResponseTimeout.value);
                }

                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg) {
                    if (parsedMsg.status === 0) {
                        ElMessage.success('复位指令已成功执行');
                    } else {
                        ElMessage.error('复位指令执行失败');
                    }
                }
            } 
            else if (whtsBackend.isModeConfigResponse(parsedData) && isWaitingModeResponse.value) {
                isWaitingModeResponse.value = false;
                if (modeResponseTimeout.value) {
                    clearTimeout(modeResponseTimeout.value);
                }

                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg) {
                    if (parsedMsg.status === 0) {
                        ElMessage.success(`模式已切换至：${parsedMsg.modeText}`);
                        detectionMode.value = parsedMsg.mode.toString();
                    } else {
                        ElMessage.error('模式切换失败');
                    }
                }
            } 
            else if (whtsBackend.isIntervalConfigResponse(parsedData) && isWaitingIntervalResponse.value) {
                isWaitingIntervalResponse.value = false;
                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg) {
                    if (parsedMsg.status === 0) {
                        ElMessage.success(`间隔配置成功：${parsedMsg.intervalMs}ms`);
                    } else {
                        ElMessage.error('间隔配置失败');
                    }
                }
            }
            else if (whtsBackend.isDeviceListResponse(parsedData)) {
                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg) {
                    const devices = parsedMsg.devices.map(device => ({
                        ...device,
                        lastUpdate: new Date().toLocaleString(),
                        isPinging: false, // 添加ping状态
                        pingResult: null  // 添加ping结果
                    }));
                    deviceList.value = devices;
                    ElMessage.success(`查询到 ${parsedMsg.deviceCount} 个设备`);
                }
            } 
            else if (whtsBackend.isPingResponse(parsedData)) {
                const parsedMsg = whtsBackend.getParsedData(parsedData);
                if (parsedMsg && currentPingTest.value) {
                    // 找到对应的设备并更新ping结果
                    const deviceIndex = deviceList.value.findIndex(device => 
                        whtsBackend.parseDeviceIdToNumber(device.deviceId) === parsedMsg.destinationId
                    );
                    
                    if (deviceIndex !== -1) {
                        deviceList.value[deviceIndex].isPinging = false;
                        deviceList.value[deviceIndex].pingResult = {
                            ...parsedMsg,
                            testTime: new Date().toLocaleString()
                        };
                        
                        ElMessage.success(`Ping测试完成: ${parsedMsg.successCount}/${parsedMsg.totalCount} (${parsedMsg.successRate})`);
                    }
                    
                    currentPingTest.value = null;
                }
            } 
            else {
                // 其他消息正常添加到日志
                logs.value.push(logEntry);
            }

            // 更新分页
            const maxPage = Math.ceil(filteredLogs.value.length / pageSize.value);
            if (currentPage.value === maxPage || currentPage.value === maxPage - 1) {
                currentPage.value = Math.ceil(logs.value.length / pageSize.value);
            }
        };

        // parseWhtsData函数现在由协议库提供

        // 处理串口数据
        const handleSerialData = (event, data) => {
            // 将接收到的数据转换为十六进制字符串
            const hexData = whtsBackend.bytesToHexString(new Uint8Array(data));

            logs.value.push({
                packetId: '--',  // 不解析，直接显示占位符
                message: '--',
                slaveId: '--',
                deviceStatus: '--',
                context: hexData, // 直接显示原始数据
                timestamp: new Date().toLocaleTimeString()
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

        // 从localStorage加载UDP配置
        const loadUdpConfig = () => {
            const savedConfig = localStorage.getItem('udpConfig');
            if (savedConfig) {
                udpConfig.value = JSON.parse(savedConfig);
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
            if (!whtsBackend.validateHexString(hexCommand.value)) {
                ElMessage.error('请输入有效的十六进制命令');
                return;
            }

            try {
                const hexArray = whtsBackend.hexStringToBytes(hexCommand.value);
                // 添加日志输出
                console.log('发送十六进制命令:', whtsBackend.bytesToHexString(hexArray));

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

        // Whts协议解析现在由协议库提供

        // UDP相关
        const udpConfig = ref({
            localPort: 8080,
            remoteIp: '192.168.1.100',
            remotePort: 8080
        });
        const udpConfigDialogVisible = ref(false);

        // 添加SLAVE_CFG_MSG配置管理
        const slaveConfigs = ref([]);  // 保存所有配置
        const configDialogVisible = ref(false);
        const createEmptyConfig = () => {
            return {
                name: '',
                slaves: [
                    {
                        id: '00000000',
                        conductionNum: '00',
                        resistanceNum: '00',
                        clipMode: '00',
                        clipStatus: '0000'
                    }
                ]
            };
        };

        const currentConfig = ref(createEmptyConfig());

        // 添加SLAVE_RST_MSG复位配置管理
        const resetConfigs = ref([]);  // 保存所有复位配置
        const resetDialogVisible = ref(false);
        const createEmptyResetConfig = () => {
            return {
                name: '',
                slaves: [
                    {
                        id: '00000000',
                        lock: '0',  // 0:解锁, 1:上锁
                        clipStatus: '0000'  // 需要复位的卡钉孔位
                    }
                ]
            };
        };

        const currentResetConfig = ref(createEmptyResetConfig());

        // 加载保存的配置
        const loadSavedConfigs = () => {
            const savedConfigs = localStorage.getItem('slaveConfigs');
            if (savedConfigs) {
                slaveConfigs.value = JSON.parse(savedConfigs);
            }
            
            // 加载复位配置
            const savedResetConfigs = localStorage.getItem('resetConfigs');
            if (savedResetConfigs) {
                resetConfigs.value = JSON.parse(savedResetConfigs);
            }
        };

        // 添加十六进制验证函数
        const validateHex = (value, length) => {
            const hexPattern = new RegExp(`^[0-9A-Fa-f]{${length}}$`);
            return hexPattern.test(value);
        };

        // 从机配置消息生成现在由协议库提供

        // 修改保存配置前的验证
        const saveConfig = () => {
            if (!currentConfig.value.name) {
                ElMessage.warning('请输入配置名称');
                return;
            }

            // 验证所有从机ID格式
            for (const slave of currentConfig.value.slaves) {
                if (!validateHex(slave.id, 8)) {
                    ElMessage.warning('从机ID必须是8位十六进制数（例如：46733B4E）');
                    return;
                }
            }

            // 创建配置的深拷贝
            const configToSave = JSON.parse(JSON.stringify(currentConfig.value));

            const existingIndex = slaveConfigs.value.findIndex(config => config.name === configToSave.name);
            if (existingIndex !== -1) {
                slaveConfigs.value[existingIndex] = configToSave;
            } else {
                slaveConfigs.value.push(configToSave);
            }

            localStorage.setItem('slaveConfigs', JSON.stringify(slaveConfigs.value));
            configDialogVisible.value = false;
            ElMessage.success('配置已保存');
        };

        // 修改添加从机函数
        const addSlave = () => {
            currentConfig.value.slaves.push({
                id: '00000000',
                conductionNum: '00',
                resistanceNum: '00',
                clipMode: '00',
                clipStatus: '0000'
            });
        };

        // 删除从机配置
        const removeSlave = (index) => {
            currentConfig.value.slaves.splice(index, 1);
        };

        // 修改发送配置函数，使用协议库
        const sendSlaveConfig = async (config) => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const message = whtsBackend.createSlaveConfigMessage(config.slaves);
                console.log('发送从机配置:', whtsBackend.bytesToHexString(message));

                // 设置等待状态
                isWaitingConfigResponse.value = true;
                currentConfigName.value = config.name;

                // 设置超时
                if (configResponseTimeout.value) {
                    clearTimeout(configResponseTimeout.value);
                }
                configResponseTimeout.value = setTimeout(() => {
                    if (isWaitingConfigResponse.value) {
                        isWaitingConfigResponse.value = false;
                        ElMessage.error('配置响应超时');
                    }
                }, 10000); // 10秒超时

                await window.electronAPI.sendUdpData(message);
            } catch (error) {
                isWaitingConfigResponse.value = false;
                ElMessage.error('发送失败：' + error.message);
            }
        };

        // 修改编辑配置函数
        const editConfig = (config) => {
            // 创建配置的深拷贝
            currentConfig.value = JSON.parse(JSON.stringify(config));
            configDialogVisible.value = true;
        };

        const deleteConfig = (index) => {
            slaveConfigs.value.splice(index, 1);
            localStorage.setItem('slaveConfigs', JSON.stringify(slaveConfigs.value));
        };

        // 添加设备列表相关代码
        const deviceList = ref([]);
        
        // 添加Ping测试相关状态
        const pingConfig = ref({
            count: 5,     // 默认ping 5次
            interval: 1000 // 默认间隔1秒
        });
        
        const pingTestResults = ref(new Map()); // 存储ping测试结果
        const currentPingTest = ref(null); // 当前正在进行的ping测试

        // 添加间隔配置相关状态
        const intervalConfig = ref({
            intervalMs: 100  // 默认100ms间隔
        });
        
        const isWaitingIntervalResponse = ref(false);

        // 查询设备列表
        const queryDeviceList = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const message = whtsBackend.createDeviceListRequestMessage();
                console.log('发送设备列表请求:', whtsBackend.bytesToHexString(message));
                await window.electronAPI.sendUdpData(message);
            } catch (error) {
                ElMessage.error('发送失败：' + error.message);
            }
        };

        // 发送间隔配置
        const sendIntervalConfig = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                isWaitingIntervalResponse.value = true;
                const message = whtsBackend.createIntervalConfigMessage(intervalConfig.value.intervalMs);
                console.log('发送间隔配置:', whtsBackend.bytesToHexString(message));
                await window.electronAPI.sendUdpData(message);

                // 设置超时
                setTimeout(() => {
                    if (isWaitingIntervalResponse.value) {
                        isWaitingIntervalResponse.value = false;
                        ElMessage.warning('间隔配置响应超时');
                    }
                }, 5000);
            } catch (error) {
                isWaitingIntervalResponse.value = false;
                ElMessage.error('发送失败：' + error.message);
            }
        };

        // 清除设备列表
        const clearDeviceList = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const message = whtsBackend.createClearDeviceListMessage();
                console.log('发送清除设备列表:', whtsBackend.bytesToHexString(message));
                await window.electronAPI.sendUdpData(message);
                ElMessage.success('清除设备列表指令已发送');
            } catch (error) {
                ElMessage.error('发送失败：' + error.message);
            }
        };

        const showNewConfigDialog = () => {
            currentConfig.value = createEmptyConfig();
            configDialogVisible.value = true;
        };

        // 复位配置管理函数
        const showNewResetDialog = () => {
            currentResetConfig.value = createEmptyResetConfig();
            resetDialogVisible.value = true;
        };

        const addResetSlave = () => {
            currentResetConfig.value.slaves.push({
                id: '00000000',
                lock: '0',
                clipStatus: '0000'
            });
        };

        const removeResetSlave = (index) => {
            currentResetConfig.value.slaves.splice(index, 1);
        };

        const saveResetConfig = () => {
            if (!currentResetConfig.value.name) {
                ElMessage.warning('请输入配置名称');
                return;
            }

            // 验证所有从机ID格式
            for (const slave of currentResetConfig.value.slaves) {
                if (!validateHex(slave.id, 8)) {
                    ElMessage.warning('从机ID必须是8位十六进制数（例如：46733B4E）');
                    return;
                }
                if (!validateHex(slave.clipStatus, 4)) {
                    ElMessage.warning('复位卡钉必须是4位十六进制数（例如：FFFF）');
                    return;
                }
            }

            // 创建配置的深拷贝
            const configToSave = JSON.parse(JSON.stringify(currentResetConfig.value));

            const existingIndex = resetConfigs.value.findIndex(config => config.name === configToSave.name);
            if (existingIndex !== -1) {
                resetConfigs.value[existingIndex] = configToSave;
            } else {
                resetConfigs.value.push(configToSave);
            }

            localStorage.setItem('resetConfigs', JSON.stringify(resetConfigs.value));
            resetDialogVisible.value = false;
            ElMessage.success('复位配置已保存');
        };

        const editResetConfig = (config) => {
            // 创建配置的深拷贝
            currentResetConfig.value = JSON.parse(JSON.stringify(config));
            resetDialogVisible.value = true;
        };

        const deleteResetConfig = (index) => {
            resetConfigs.value.splice(index, 1);
            localStorage.setItem('resetConfigs', JSON.stringify(resetConfigs.value));
        };

        // 发送复位指令
        const sendSlaveReset = async (config) => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                const message = whtsBackend.createSlaveResetMessage(config.slaves);
                console.log('发送从机复位指令:', whtsBackend.bytesToHexString(message));

                // 设置等待状态
                isWaitingResetResponse.value = true;

                // 设置超时
                if (resetResponseTimeout.value) {
                    clearTimeout(resetResponseTimeout.value);
                }
                resetResponseTimeout.value = setTimeout(() => {
                    if (isWaitingResetResponse.value) {
                        isWaitingResetResponse.value = false;
                        ElMessage.error('复位响应超时');
                    }
                }, 10000); // 10秒超时

                await window.electronAPI.sendUdpData(message);
            } catch (error) {
                isWaitingResetResponse.value = false;
                ElMessage.error('发送复位指令失败：' + error.message);
            }
        };

        // 显示UDP配置弹出框
        const showUdpConfigDialog = () => {
            udpConfigDialogVisible.value = true;
        };

        // 保存UDP配置并连接
        const saveUdpConfig = async () => {
            // 验证配置
            if (!udpConfig.value.localPort || udpConfig.value.localPort < 1 || udpConfig.value.localPort > 65535) {
                ElMessage.error('本地端口必须是1-65535之间的数字');
                return;
            }

            if (!udpConfig.value.remotePort || udpConfig.value.remotePort < 1 || udpConfig.value.remotePort > 65535) {
                ElMessage.error('远程端口必须是1-65535之间的数字');
                return;
            }

            // 验证IP地址
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(udpConfig.value.remoteIp)) {
                ElMessage.error('请输入有效的IP地址');
                return;
            }

            // 验证IP地址的每个段
            const ipParts = udpConfig.value.remoteIp.split('.');
            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    ElMessage.error('IP地址每段必须在0-255之间');
                    return;
                }
            }

            try {
                // 如果已连接，先断开
                if (isConnected.value) {
                    await disconnectCurrent();
                }

                const result = await window.electronAPI.createUdpSocket({
                    localPort: udpConfig.value.localPort,
                    remoteIp: udpConfig.value.remoteIp,
                    remotePort: udpConfig.value.remotePort
                });

                if (result.success) {
                    isConnected.value = true;
                    udpConfigDialogVisible.value = false;
                    ElMessage.success('UDP已连接');
                    
                    // 保存配置到localStorage
                    localStorage.setItem('udpConfig', JSON.stringify(udpConfig.value));
                } else {
                    ElMessage.error('UDP连接失败：' + result.error);
                }
            } catch (error) {
                ElMessage.error('连接失败：' + error.message);
            }
        };

        // 检测模式切换函数
        const switchDetectionMode = async () => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            try {
                isWaitingModeResponse.value = true;
                
                const modeValue = parseInt(detectionMode.value);
                const modeCmd = whtsBackend.createModeConfigMessage(modeValue);
                
                console.log('发送模式切换命令:', whtsBackend.bytesToHexString(modeCmd));
                
                await window.electronAPI.sendUdpData(modeCmd);

                // 设置响应超时
                if (modeResponseTimeout.value) {
                    clearTimeout(modeResponseTimeout.value);
                }

                modeResponseTimeout.value = setTimeout(() => {
                    if (isWaitingModeResponse.value) {
                        isWaitingModeResponse.value = false;
                        ElMessage.error('模式切换响应超时');
                    }
                }, 5000); // 5秒超时

            } catch (error) {
                isWaitingModeResponse.value = false;
                ElMessage.error('模式切换失败：' + error.message);
            }
        };

        // 添加配置响应相关的状态
        const isWaitingConfigResponse = ref(false);
        const configResponseTimeout = ref(null);
        const currentConfigName = ref('');

        // 添加检测模式相关的状态
        const detectionMode = ref('0'); // 默认导通检测模式
        const isWaitingModeResponse = ref(false);
        const modeResponseTimeout = ref(null);

        // 添加复位响应相关的状态
        const isWaitingResetResponse = ref(false);
        const resetResponseTimeout = ref(null);

        // Ping测试函数
        const startPingTest = async (device) => {
            if (!isConnected.value) {
                ElMessage.warning('请先建立连接');
                return;
            }

            if (device.isPinging) {
                ElMessage.warning('该设备正在进行Ping测试');
                return;
            }

            try {
                // 设置设备状态为ping中
                device.isPinging = true;
                device.pingResult = null;

                // 解析设备ID
                const destinationId = whtsBackend.parseDeviceIdToNumber(device.deviceId);
                
                // 创建ping控制消息
                const pingMessage = whtsBackend.createPingCtrlMessage(
                    0, // 单次Ping模式
                    pingConfig.value.count,
                    pingConfig.value.interval,
                    destinationId
                );

                // 记录当前ping测试
                currentPingTest.value = {
                    deviceId: device.deviceId,
                    startTime: Date.now()
                };

                console.log('发送Ping测试:', whtsBackend.bytesToHexString(pingMessage));
                await window.electronAPI.sendUdpData(pingMessage);

                // 设置超时处理
                setTimeout(() => {
                    if (device.isPinging && currentPingTest.value?.deviceId === device.deviceId) {
                        device.isPinging = false;
                        currentPingTest.value = null;
                        ElMessage.error('Ping测试超时');
                    }
                }, (pingConfig.value.count * pingConfig.value.interval) + 5000); // 额外5秒超时缓冲

            } catch (error) {
                device.isPinging = false;
                currentPingTest.value = null;
                ElMessage.error('Ping测试失败：' + error.message);
            }
        };

        // 获取Ping结果的标签类型
        const getPingResultType = (successRate) => {
            const rate = parseFloat(successRate);
            if (rate >= 90) return 'success';
            if (rate >= 70) return 'warning';
            return 'danger';
        };

        onMounted(() => {
            scanPorts();
            window.electronAPI.onSerialData(handleSerialData);
            window.electronAPI.onUdpData(handleUdpData);
            loadTableConfig();
            loadSavedConfigs();
            loadUdpConfig();
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
            clearConductionData,
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
            sendStartCommand,
            sendStopCommand,
            configDialogVisible,
            currentConfig,
            slaveConfigs,
            addSlave,
            removeSlave,
            saveConfig,
            sendSlaveConfig,
            editConfig,
            deleteConfig,
            deviceList,
            queryDeviceList,
            clearDeviceList,
            showNewConfigDialog,
            isWaitingConfigResponse,
            intervalConfig,
            sendIntervalConfig,
            isWaitingIntervalResponse,
            currentConfigName,
            detectionMode,
            isWaitingModeResponse,
            switchDetectionMode,
            udpConfigDialogVisible,
            showUdpConfigDialog,
            saveUdpConfig,
            pingConfig,
            startPingTest,
            getPingResultType,
            currentPingTest,
            resetConfigs,
            resetDialogVisible,
            currentResetConfig,
            showNewResetDialog,
            addResetSlave,
            removeResetSlave,
            saveResetConfig,
            editResetConfig,
            deleteResetConfig,
            sendSlaveReset,
            isWaitingResetResponse
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
    overflow: auto;
    padding: 20px;
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

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.slave-config-item {
    margin-bottom: 20px;
    padding: 20px;
    border: 1px solid #EBEEF5;
    border-radius: 4px;
}

.slave-config-info {
    margin: 5px 0;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 500px;
    /* 设置最小宽度确保内容不会挤压 */
}

/* 配置管理容器样式 */
.config-management-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.config-header {
    flex-shrink: 0;
}

.config-table-container {
    flex: 1;
    overflow: auto;
}

/* 调整表格容器样式 */
.log-table-container {
    height: calc(100% - 60px);
    /* 减去控制面板的高度 */
    overflow: auto;
}

.output-window {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.control-panel {
    flex-shrink: 0;
}

/* 确保表格内容可以水平滚动 */
.slave-config-info {
    margin: 5px 0;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 500px;
    /* 设置最小宽度确保内容不会挤压 */
}

/* 调整表格固定列的样式 */
.el-table .el-table__fixed-right {
    height: 100% !important;
    bottom: 0;
}

/* 确保内容区域填满可用空间 */
.serial-port-assistant {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.el-container {
    flex: 1;
    min-height: 0;
    /* 允许容器收缩 */
}

.el-main {
    flex: 1;
    overflow: hidden;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.serial-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.device-query-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.query-header {
    flex-shrink: 0;
}

.device-table-container {
    flex: 1;
    overflow: auto;
}

/* Ping相关样式 */
.ping-config {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 间隔配置样式 */
.interval-config {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ping-result {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ping-time {
    font-size: 12px;
    color: #909399;
}

.no-result {
    color: #C0C4CC;
}

/* 复位配置相关样式 */
.reset-management-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.reset-header {
    flex-shrink: 0;
}

.reset-table-container {
    flex: 1;
    overflow: auto;
}

.reset-config-info {
    margin: 5px 0;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 400px;
}
</style>