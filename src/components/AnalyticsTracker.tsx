import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { baidu, subscribeAnalyticsConsent } from '../api/baidu'

export function AnalyticsTracker() {
  const location = useLocation()
  useLayoutEffect(() => {
    baidu.visit({ ...location, origin: window.location.origin })
    return subscribeAnalyticsConsent(() => baidu.consentChanged())
  }, [location])
  return null
}
