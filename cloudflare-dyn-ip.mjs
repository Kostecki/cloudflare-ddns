#!/usr/bin/env zx

const rawConfig = await fs.readFile("./config.json");
const config = JSON.parse(rawConfig);

const headerOptions = {
  method: "GET",
  headers: {
    Authorization: `Bearer ${config.apikey}`,
    "Content-Type": "application/json",
  },
};

const getExternalIP = async () => {
  return await fetch("https://icanhazip.com")
    .then((response) => response.text())
    .then((data) => data.trim())
    .catch((err) => console.error(err));
};

const getCloudflareIP = async () => {
  return await fetch(
    `${config.endpoint}/${config.zones[0].zoneId}/dns_records?type=A`,
    headerOptions
  )
    .then((response) => response.json())
    .then((data) => data.result[0].content.trim())
    .catch((err) => console.error(err));
};

const updateDNS = async () => {
  const externalIP = await getExternalIP();
  const cloudflareIP = await getCloudflareIP();

  // IP mismatch. Update Cloudflare records
  if (externalIP !== cloudflareIP) {
    zones.forEach((zone) => {
      const url = `${config.endpoint}/${zone.zoneId}/dns_records/${zone.dnsRecordId}`;

      fetch(url, {
        ...headerOptions,
        method: "PATCH",
        body: JSON.stringify({
          content: externalIP,
        }),
      }).catch((err) => console.error(err));
    });
  }
};

updateDNS();
