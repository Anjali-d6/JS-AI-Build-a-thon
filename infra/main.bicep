targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param rg string = ''
param webappName string = 'webapp'

// 👉 NEW PARAMETERS FOR WEBAPI SERVICE
param webapiName string = 'webapi-anjali-2025' // ⚠️ Replace with a unique name (avoid 'webapi')
param appServicePlanName string = 'appserviceplan'

@description('Location for the Static Web App')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia', 'eastasiastage'])
@metadata({
  azd: {
    type: 'location'
  }
})
param webappLocation string

@description('Id of the user or app to assign application roles')
param principalId string

// ---------------------------------------------------------------------------
// Common variables
var abbrs = loadJsonContent('./abbreviations.json')
var tags = {
  'azd-env-name': environmentName
}

// ---------------------------------------------------------------------------
// Resources

// Organize resources in a resource group ✅
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(rg) ? rg : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// Static Web App module
module webapp 'br/public:avm/res/web/static-site:0.7.0' = {
  name: 'webapp'
  scope: resourceGroup
  params: {
    name: webappName
    location: webappLocation
    tags: union(tags, { 'azd-service-name': webappName })
    sku: 'Standard'
  }
}

// 👉 NEW MODULE: App Service Plan
module serverfarm 'br/public:avm/res/web/serverfarm:0.4.1' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: appServicePlanName
    skuName: 'B1'
  }
}

// 👉 NEW MODULE: Web API App Service
module webapi 'br/public:avm/res/web/site:0.15.1' = {
  name: 'webapi'
  scope: resourceGroup
  params: {
    kind: 'app'
    name: webapiName
    tags: union(tags, { 'azd-service-name': webapiName })
    serverFarmResourceId: serverfarm.outputs.resourceId
  }
}

// ---------------------------------------------------------------------------
// Outputs
output WEBAPP_URL string = webapp.outputs.defaultHostname
output WEBAPI_URL string = webapi.outputs.defaultHostname // 👉 NEW OUTPUT
