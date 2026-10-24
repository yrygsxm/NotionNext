/** Public, related reading for the Saily article and the main resource index. */
export default function SailyGuideLinks({ compact = false }) {
  return (
    <aside
      aria-label='Saily eSIM 使用资源'
      className='my-5 rounded-2xl border border-gray-200 bg-[var(--heo-color-card)] p-5 dark:border-gray-600 dark:bg-[var(--heo-color-bg-dark)]'>
      <h2 className='mb-2 text-lg font-bold'>Saily eSIM 邀请码与使用指南</h2>
      <p className='mb-3 text-sm leading-7'>
        {compact
          ? '旅行前可查看独立指南中的邀请码条件、兑换入口与安装说明。'
          : '准备使用 Saily 时，可先核对邀请码的活动来源、适用条件和应用中的实际优惠，再按教程兑换与安装。以下为 APPDO 运营的独立指南。'}
      </p>
      <ul className='flex flex-wrap gap-x-5 gap-y-2 text-sm leading-7'>
        <li><a className='underline underline-offset-4' href='https://saily.appdo.xyz/zh/referral-code/'>Saily 邀请码与优惠条件</a></li>
        <li><a className='underline underline-offset-4' href='https://saily.appdo.xyz/zh/guides/saily-referral-code/'>邀请码在哪里输入</a></li>
        <li><a className='underline underline-offset-4' href='https://saily.appdo.xyz/ja/referral-code/' lang='ja' hrefLang='ja'>Saily 紹介コード・特典条件</a></li>
      </ul>
      {!compact && <p className='mt-3 text-xs leading-6'>使用指南中的代码可能为运营者带来推荐奖励；优惠与资格以 Saily 应用实际显示为准。</p>}
    </aside>
  )
}
