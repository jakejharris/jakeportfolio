import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'q1u033fj',
    dataset: 'production',
  },
  // `studioHost` is deprecated in favour of `deployment.appId`, which is only
  // issued by `sanity deploy`. The studio is embedded in the Next app, so keep
  // the host name for now.
  studioHost: 'jakeportfolio',
  deployment: {
    autoUpdates: true,
  },
})
