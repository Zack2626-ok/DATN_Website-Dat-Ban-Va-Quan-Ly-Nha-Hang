const fs = require('fs');
let data = fs.readFileSync('src/views/chef/inventory/index.tsx', 'utf8');

data = data.replace(
  /export const clearNotificationsApi = async \(role\?: string\): Promise<any> => \{/,
  \export const getAllBatchesApi = async (): Promise<any[]> => {
  const response = await api.get('/inventory/batches/all');
  return response.data.data;
};

export const clearNotificationsApi = async (role?: string): Promise<any> => {\
);

fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
