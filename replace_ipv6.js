const dotenv = require("dotenv");
const superagent = require("superagent");

dotenv.config();

if (process.argv.length < 3) {
  console.error("Usage: node replace_ipv6.js <old_ipv6> <new_ipv6>");
  process.exit(1);
}

const oldIpv6 = process.argv[2];
const newIpv6 = process.argv[3];

const baseUrl = "https://api.cloudflare.com/client/v4";
const apiToken = process.env.CLOUDFLARE_API_KEY;
const accountMail = process.env.CLOUDFLARE_ACCOUNT_MAIL;
const domains = process.env.CLOUDFLARE_DOMAINS.split(",");

console.log(`Cloudflare Account: ${accountMail} (API-Key: ${apiToken})`);
console.log(`IPv6: ${oldIpv6} -> ${newIpv6}`);

const getZones = async () => {
  try {
    console.log("Fetching zones...");

    const response = await superagent
      .get(`${baseUrl}/zones?per_page=50`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + apiToken);

    return response.body.result;
  } catch (e) {
    console.error(e);
  }
};

const getRecords = async (id) => {
  try {
    const response = await superagent
      .get(`${baseUrl}/zones/${id}/dns_records`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + apiToken);

    return response.body.result;
  } catch (e) {
    console.error(e);
  }
};

const updateRecord = async (zoneId, record) => {
  try {
    const response = await superagent
      .patch(`${baseUrl}/zones/${zoneId}/dns_records/${record.id}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + apiToken)
      .send(record);
  } catch (e) {
    console.error(e);
  }
};

const main = async () => {
  const zones = await getZones();
  for (const zone of zones) {
    console.log(`Zone: ${zone.name} (${zone.id}) - Owner ${zone.owner.email}`);
    if (domains.includes(zone.name)) {
      const records = await getRecords(zone.id);
      for (const record of records) {
        if (record.type === "AAAA") {
            console.log(`Record: ${record.name} (${record.id}) - ${record.content}`);
            if (record.content.includes(oldIpv6)) {
              console.log(`Replacing ${oldIpv6} with ${newIpv6}`);
              record.content = record.content.replace(oldIpv6, newIpv6);
              await updateRecord(zone.id, record);
            }
          }
      }
    }
  }
};

main().then(() => {
  console.log("Done");
});
