#!/usr/bin/env zx

const rawConfig = await fs.readFile("./config.json");
const config = JSON.parse(rawConfig);

const cf_headerOptions = {
  method: "GET",
  headers: {
    Authorization: `Bearer ${config.cf_apikey}`,
    "Content-Type": "application/json",
  },
};

const tg_headerOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: {
    chat_id: config.tg_chatId,
    parse_mode: "HTML",
  },
};

const sendNotification = async (text) => {
  const body = JSON.stringify({ ...tg_headerOptions.body, text });

  return await fetch(
    `https://api.telegram.org/bot${config.tg_apikey}/sendMessage`,
    { ...tg_headerOptions, body }
  )
    .then((resp) => {
      if (!resp.ok) {
        throw resp;
      }
    })
    .catch((error) => {
      error.json().then(({ description }) => {
        console.error(description);
      });
    });
};

const getExternalIP = async () => {
  return await fetch("https://icanhazip.com")
    .then((response) => response.text())
    .then((data) => data.trim());
};

const getCloudflareIP = async () => {
  return await fetch(
    `${config.cf_endpoint}/${config.cf_zones[0].zoneId}/dns_records?type=A`,
    cf_headerOptions
  )
    .then((response) => response.json())
    .then((data) => data.result[0].content.trim());
};

const updateDNS = async () => {
  const externalIP = await getExternalIP();
  const cloudflareIP = await getCloudflareIP();

  // IP mismatch. Update Cloudflare records
  if (externalIP && cloudflareIP && externalIP !== cloudflareIP) {
    const requests = Promise.all(
      config.cf_zones.map((zone) => {
        const url = `${config.cf_endpoint}/${zone.zoneId}/dns_records/${zone.dnsRecordId}`;

        return new Promise((resolve) => {
          fetch(url, {
            ...cf_headerOptions,
            method: "PATCH",
            body: JSON.stringify({
              content: externalIP,
            }),
          })
            .then((resp) => {
              if (resp.status !== 200) {
                throw resp;
              }

              return resp.json();
            })
            .then(() => resolve())
            .catch(({ statusText }) => {
              console.error(`updateDNS, ${zone.domain}: ${statusText}`);
            });
        });
      })
    );

    requests.then(() => {
      sendNotification(
        `<b>Cloudflare DDNS</b> \nNew IP: ${cloudflareIP} => ${externalIP}`
      );
    });
  }
};

updateDNS();
