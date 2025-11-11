#!/usr/bin/env node

/**
 * OpenAI账户分组诊断工具
 * 用于排查OpenAI账户无法加入分组的问题
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const redis = require('../src/models/redis')
const logger = require('../src/utils/logger')

async function diagnoseOpenAIGroups() {
  try {
    logger.info('🔍 开始诊断OpenAI账户分组问题...\n')

    const client = redis.getClientSafe()

    // 1. 获取所有分组
    logger.info('📋 步骤1: 检查所有分组')
    const groupIds = await client.smembers('account_groups')
    logger.info(`找到 ${groupIds.length} 个分组\n`)

    const groups = []
    for (const groupId of groupIds) {
      const groupData = await client.hgetall(`account_group:${groupId}`)
      if (groupData && groupData.id) {
        groups.push({
          id: groupData.id,
          name: groupData.name,
          platform: groupData.platform,
          memberCount: groupData.memberCount || 0
        })
      }
    }

    // 按平台分组显示
    const groupsByPlatform = {
      claude: [],
      gemini: [],
      openai: [],
      droid: []
    }

    groups.forEach((group) => {
      if (groupsByPlatform[group.platform]) {
        groupsByPlatform[group.platform].push(group)
      }
    })

    console.log('═══════════════════════════════════════')
    console.log('分组列表（按平台分类）')
    console.log('═══════════════════════════════════════\n')

    for (const [platform, platformGroups] of Object.entries(groupsByPlatform)) {
      if (platformGroups.length > 0) {
        console.log(`🔹 ${platform.toUpperCase()} 平台:`)
        platformGroups.forEach((group) => {
          console.log(`   • ${group.name} (ID: ${group.id}, 成员: ${group.memberCount})`)
        })
        console.log('')
      }
    }

    // 2. 检查OpenAI平台分组
    logger.info('📋 步骤2: 检查OpenAI平台分组')
    const openaiGroups = groupsByPlatform.openai
    if (openaiGroups.length === 0) {
      logger.warn('⚠️  未找到OpenAI平台的分组!')
      logger.warn('   → 这是问题所在: OpenAI账户只能加入platform="openai"的分组\n')
      logger.info('💡 解决方案:')
      logger.info('   1. 在Web管理界面创建新分组')
      logger.info('   2. 平台类型选择 "OpenAI"')
      logger.info('   3. 然后将OpenAI账户加入该分组\n')
    } else {
      logger.success(`✅ 找到 ${openaiGroups.length} 个OpenAI平台分组:`)
      openaiGroups.forEach((group) => {
        logger.success(`   • ${group.name} (ID: ${group.id})`)
      })
      console.log('')
    }

    // 3. 获取所有OpenAI账户
    logger.info('📋 步骤3: 检查OpenAI账户')
    const openaiAccountKeys = await client.keys('openai_account:*')
    logger.info(`找到 ${openaiAccountKeys.length} 个OpenAI账户\n`)

    const openaiAccounts = []
    for (const key of openaiAccountKeys) {
      const accountData = await client.hgetall(key)
      if (accountData && accountData.id) {
        openaiAccounts.push({
          id: accountData.id,
          name: accountData.name,
          accountType: accountData.accountType || 'shared',
          platform: accountData.platform || 'openai'
        })
      }
    }

    console.log('═══════════════════════════════════════')
    console.log('OpenAI账户列表')
    console.log('═══════════════════════════════════════\n')

    openaiAccounts.forEach((account) => {
      console.log(
        `• ${account.name} (ID: ${account.id}, 类型: ${account.accountType}, 平台: ${account.platform})`
      )

      // 检查该账户所属的分组
      if (account.accountType === 'group') {
        let foundInGroup = false
        for (const group of openaiGroups) {
          client
            .sismember(`account_group_members:${group.id}`, account.id)
            .then((isMember) => {
              if (isMember) {
                console.log(`  ↳ 属于分组: ${group.name}`)
                foundInGroup = true
              }
            })
        }
        if (!foundInGroup) {
          console.log(`  ↳ ⚠️  标记为group类型但未找到所属分组`)
        }
      }
    })
    console.log('')

    // 4. 分析问题
    logger.info('📋 步骤4: 问题分析\n')

    console.log('═══════════════════════════════════════')
    console.log('诊断结果')
    console.log('═══════════════════════════════════════\n')

    const issues = []

    if (openaiGroups.length === 0) {
      issues.push({
        level: 'ERROR',
        message: '未创建OpenAI平台的分组',
        solution: '创建一个平台类型为"OpenAI"的新分组'
      })
    }

    if (openaiAccounts.length === 0) {
      issues.push({
        level: 'WARN',
        message: '未找到OpenAI账户',
        solution: '请先添加OpenAI账户'
      })
    }

    const groupTypeAccounts = openaiAccounts.filter((a) => a.accountType === 'group')
    if (groupTypeAccounts.length === 0 && openaiAccounts.length > 0) {
      issues.push({
        level: 'INFO',
        message: '所有OpenAI账户都不是group类型',
        solution: '如需使用分组，请将账户类型改为"Group"并选择分组'
      })
    }

    if (issues.length === 0) {
      logger.success('✅ 未发现配置问题')
      logger.info('\n如果仍然无法添加账户到分组，请检查:')
      logger.info('  1. 浏览器控制台是否有错误')
      logger.info('  2. 后端日志 logs/claude-relay-*.log 中的错误信息')
      logger.info('  3. 确认选择的分组确实是OpenAI平台类型')
    } else {
      logger.warn(`发现 ${issues.length} 个问题:\n`)
      issues.forEach((issue, index) => {
        const icon = issue.level === 'ERROR' ? '❌' : issue.level === 'WARN' ? '⚠️' : 'ℹ️'
        console.log(`${icon} 问题 ${index + 1}: ${issue.message}`)
        console.log(`   💡 解决方案: ${issue.solution}\n`)
      })
    }

    // 5. 提供具体操作步骤
    if (openaiGroups.length === 0) {
      console.log('═══════════════════════════════════════')
      console.log('详细操作步骤')
      console.log('═══════════════════════════════════════\n')
      console.log('1️⃣  创建OpenAI分组:')
      console.log('   • 进入Web管理界面')
      console.log('   • 点击"账户管理" -> "分组管理"')
      console.log('   • 点击"创建新分组"')
      console.log('   • 分组名称: 输入任意名称 (如"OpenAI主账户组")')
      console.log('   • 平台类型: 选择"OpenAI" ← 重要!')
      console.log('   • 点击"创建"\n')
      console.log('2️⃣  添加OpenAI账户到分组:')
      console.log('   • 编辑OpenAI账户')
      console.log('   • 账户类型: 改为"Group"')
      console.log('   • 选择分组: 选择刚创建的OpenAI分组')
      console.log('   • 点击"保存"\n')
    }

    logger.info('✅ 诊断完成!\n')
    process.exit(0)
  } catch (error) {
    logger.error('❌ 诊断过程出错:', error)
    process.exit(1)
  }
}

// 运行诊断
diagnoseOpenAIGroups()