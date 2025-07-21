Xendit.setPublishableKey("xnd_public_development_NbMdAf_J7yUUCvbgi4nwWSFCBkgHzfz4tErzqrSABHB79hhGW2tyD3RvAYH53cL");
const $ = id => document.getElementById(id);
const showJSON = (el, title, obj) => el.textContent = title + "\n" + JSON.stringify(obj, null, 2);
const showModal = url => { $("modal-frame").src = url; $("modal").style.display = "block"; };
let packets = {};

function shortenUUID(uuid) {
  return uuid.substring(0, uuid.indexOf("-"))
}

async function makeRequest(method, endpoint, authenticate, body) {
  if (authenticate) {
    headers = {
      "Authorization": `Token ${$("auth_token").value}`,
      "Content-Type": "application/json",
    }
  } else {
    headers = {
      "Content-Type": "application/json",
    }
  }

  const resp = await fetch(`http://localhost:8000${endpoint}`, {
    method: method,
    headers: headers,
    body: body === null ? null : JSON.stringify(body)
  });
  return await resp.json();
}

async function populatePackets() {
  const data = await makeRequest("GET", "/subscriptions/packet-offer/", false, null);
  const sel = $("packet-select");
  sel.innerHTML = "";
  data.data.forEach(packet => {
    let opt = document.createElement("option");
    opt.value = packet.id,
      opt.text = `${shortenUUID(packet.id)} -- ${packet.packet_name} -- Rp${packet.price}`;
    sel.appendChild(opt);
    packets[packet.id] = packet;
  });
  sel.dispatchEvent(new Event("change"));
}

function getTokenInput(prefix) {
  const cardData = {
    card_number: $(`${prefix}-card-number`).value,
    card_exp_month: $(`${prefix}-exp-month`).value,
    card_exp_year: $(`${prefix}-exp-year`).value,
    card_cvn: $(`${prefix}-card-cvn`).value,
    card_holder_first_name: $(`${prefix}-firstname`).value,
    card_holder_last_name: $(`${prefix}-lastname`).value,
    card_holder_email: $(`${prefix}-email`).value,
    card_holder_phone_number: $(`${prefix}-phone`).value,
    is_multiple_use: true,
  };
  return cardData;
}

async function fetchCardToken(cardId) {
  const data = await makeRequest("GET", `/financials/user-cards/${cardId}`, true, null);
  return data.card_token;
}

$("save-form").addEventListener("submit", async e => {
  e.preventDefault();
  const cardData = getTokenInput("save");
  Xendit.card.createToken(cardData, async function (err, token_resp) {
    if (err) {
      $("save-token-response").textContent = err.message;
      return;
    }

    showJSON($("save-response-xendit"), "Xendit Response", token_resp);

    // store
    const last4 = cardData.card_number.slice(-4);
    const resp = await makeRequest("POST", "/financials/user-cards/", true, {
      brand: `BRAND_${token_resp.card_info.brand}`,
      card_token: token_resp.id,
      last4_digits: last4,
    });
    showJSON($("save-response-backend"), "Backend Response", resp);
  });
});

$("load-btn").addEventListener("click", async () => {
  const tokens = await makeRequest("GET", "/financials/user-cards/", true, null);
  showJSON($("cards-response-backend"), "Backend Response", tokens);
  const sel = $("card-select");
  sel.innerHTML = "";
  tokens.cards.forEach((t, i) => {
    let opt = document.createElement("option");
    opt.value = t.id;
    opt.text = `${shortenUUID(t.id)} -- ${t.brand} -- **** ${t.last4_digits}`;
    sel.appendChild(opt);
  });
  sel.dispatchEvent(new Event("change"));
});

$("card-select").addEventListener("change", e => {
  const els = document.querySelectorAll(".card-id-input");
  els.forEach(el => {
    const text = e.target.options[e.target.selectedIndex].text;
    el.innerHTML = text;
  });
});

$("details-btn").addEventListener("click", async () => {
  const id = $("card-select").value;
  const body = await makeRequest("GET", `/financials/user-cards/${id}`, true, null);
  showJSON($("details-response-backend"), "Backend Response", body);
});


$("delete-btn").addEventListener("click", async () => {
  const id = $("card-select").value;
  const body = await makeRequest("DELETE", `/financials/user-cards/${id}`, true, null);
  showJSON($("delete-response-backend"), "Backend Response", body);
});

$("update-form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("card-select").value;
  const cardData = getTokenInput("update");
  Xendit.card.createToken(cardData, async function (err, token_resp) {
    if (err) {
      $("update-response-xendit").textContent = err.message;
      return;
    }

    showJSON($("update-response-xendit"), "Xendit Response", token_resp);

    // update
    const body = await makeRequest("PUT", `/financials/user-cards/${id}`, true, {
      card_token: token_resp.id,
    });
    showJSON($("update-response-backend"), "Backend Response", body);
  });
});

$("packet-select").addEventListener("change", e => {
  const els = document.querySelectorAll(".packet-id-input");
  els.forEach(el => {
    const text = e.target.options[e.target.selectedIndex].text;
    el.innerHTML = text;
  });
});

$("charge-noauth-btn").addEventListener("click", async () => {
  const resp = await makeRequest("POST", "/subscriptions/checkout/", true, {
    packet_id: $("packet-select").value,
    promo_code: null,
    payment_method: "CARD",
    user_card_id: $("card-select").value,
    authentication_id: "some invalid auth id",
  });
  showJSON($("charge-noauth-response"), "Backend Response", resp);
});

$("auth-btn").addEventListener("click", async () => {
  const card_id = $("card-select").value;
  const token = await fetchCardToken(card_id);
  const packet_id = $("packet-select").value;
  const packet_price = packets[packet_id].price;

  const authData = {
    amount: packet_price,
    token_id: token,
  };

  Xendit.card.createAuthentication(authData, function (err, auth_resp) {
    if (err) {
      $("auth-response").textContent = err.message;
      return;
    }
    showJSON($("auth-response"), "Xendit response", auth_resp);
    $("auth-id").value = auth_resp.id;
    $("auth-id-input").innerHTML = auth_resp.id;
    if (auth_resp.status === "IN_REVIEW" && auth_resp.payer_authentication_url) {
      showModal(auth_resp.payer_authentication_url);
    }
  });
});

$("charge-auth-btn").addEventListener("click", async () => {
  const resp = await makeRequest("POST", "/subscriptions/checkout/", true, {
    packet_id: $("packet-select").value,
    promo_code: null,
    payment_method: "CARD",
    user_card_id: $("card-select").value,
    authentication_id: $("auth-id").value,
  });
  $("get-charge-id").value = resp.charge_id;
  $("verify-id").value = resp.id;
  showJSON($("charge-auth-response"), "Backend Response", resp);
});

$("get-charge-btn").addEventListener("click", async () => {
  const charge_id = $("get-charge-id").value;
  const resp = await makeRequest("GET", `/financials/card-charge/${charge_id}`, true, null);
  showJSON($("get-charge-response"), "Backend Response", resp);
});

$("verify-btn").addEventListener("click", async () => {
  const trx_id = $("verify-id").value;
  const resp = await makeRequest("GET", `/financials/transaction/${trx_id}`, true, null);
  showJSON($("verify-response"), "Backend Response", resp);
});

populatePackets();