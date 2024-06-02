const dotenv = require("dotenv");
const superagent = require("superagent");

dotenv.config();

if (process.argv.length < 3) {
  console.error("Usage: node replace_ipv4.js <old_ipv4> <new_ipv4>");
  process.exit(1);
}

const oldIpv4 = process.argv[2];
const newIpv4 = process.argv[3];

const baseUrl = "https://api.cloudflare.com/client/v4";
const apiToken = process.env.CLOUDFLARE_API_KEY;
const accountMail = process.env.CLOUDFLARE_ACCOUNT_MAIL;
const domains = process.env.CLOUDFLARE_DOMAINS.split(",");

console.log(`Cloudflare Account: ${accountMail} (API-Key: ${apiToken})`);
console.log(`IPv4: ${oldIpv4} -> ${newIpv4}`);

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
        if (record.type === "A") {
            console.log(`Record: ${record.name} (${record.id}) - ${record.content}`);
            if (record.content.includes(oldIpv4)) {
              console.log(`Replacing ${oldIpv4} with ${newIpv4}`);
              record.content = newIpv4;
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
