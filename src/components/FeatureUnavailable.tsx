import { Alert } from 'antd'
export function FeatureUnavailable({ feature, detail }: { feature: string; detail: string }) { return <Alert type="info" showIcon message={`${feature}已预留界面`} description={detail} className="mb-5" /> }
