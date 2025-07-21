from flask import Flask, request, jsonify, render_template, Response
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from xendit import CreditCard
import os, uuid
import xendit

load_dotenv()

PUBLISHABLE_KEY = os.getenv("XENDIT_PUBLIC")
SECRET_KEY = os.getenv("XENDIT_SECRET")
FERNET_KEY = os.getenv("FERNET_KEY")

xendit.api_key=SECRET_KEY
fernet = Fernet(FERNET_KEY)

# { token_id: {enc: <cipher>, last4: "1234"} }
TOKENS = {}

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", publishable_key=PUBLISHABLE_KEY)

# IMPORTANT: All api calls are now routed to the actual backend

# @app.route("/tokens", methods=["POST"])
# def create_token():
#     data = request.get_json(force=True)
#     cc_token = data.get("cc_token")
#     last4 = data.get("last4")
#     if not cc_token or not last4:
#         return jsonify(error="cc_token and last4 required"), 400

#     internal_id = str(uuid.uuid4())
#     TOKENS[internal_id] = {
#         "enc" : fernet.encrypt(cc_token.encode()).decode(),
#         "last4": last4
#     }
#     return jsonify(id=internal_id), 201

# @app.route("/tokens", methods=["GET"])
# def list_tokens():
#     results = [
#         {"id": id, "last4": data['last4']}
#         for id, data in TOKENS.items()
#     ]
#     return jsonify(results)

# @app.route("/tokens/<token_uuid>", methods=["GET"])
# def get_token(token_uuid):
#     info = TOKENS.get(token_uuid)
#     if not info:
#         return jsonify(error="token not found"), 404
#     real_token = fernet.decrypt(info['enc'].encode()).decode()
#     return jsonify(id=token_uuid, cc_token=real_token, last4=info['last4'])

# @app.route("/charge_no_auth", methods=["POST"])
# def charge_no_auth():
#     data = request.get_json(force=True)
#     cc_token = data.get("cc_token")
#     if not cc_token:
#         return jsonify(error="cc_token missing"), 400
#     try:
#         charge = CreditCard.create_charge(
#             token_id=cc_token,
#             external_id=f"noauth-{uuid.uuid4()}",
#             amount=100000
#         )
#         json_str = repr(charge)
#         return Response(json_str, status=200, mimetype='application/json')
#     except Exception as e:
#         return jsonify(error=str(e)), 400

# @app.route("/charge_auth", methods=["POST"])
# def charge_auth():
#     data = request.get_json(force=True)
#     cc_token = data.get("cc_token")
#     authid = data.get("auth_id")
#     if not cc_token or not authid:
#         return jsonify(error="cc_token and auth_id required"), 400
#     try:
#         charge = CreditCard.create_charge(
#             token_id=cc_token,
#             authentication_id=authid,
#             external_id=f"auth-{uuid.uuid4()}",
#             amount=100000
#         )
#         print(charge)
#         print(charge.status)
#         json_str = repr(charge)
#         return Response(json_str, status=200, mimetype='application/json')
#     except Exception as e:
#         return jsonify(error=str(e)), 400

# @app.route("/charge/<charge_id>", methods=["GET"])
# def get_charge(charge_id):
#     try:
#         charge = CreditCard.get_charge(credit_card_charge_id=charge_id)
#         json_str = repr(charge)
#         return Response(json_str, status=200, mimetype='application/json')
#     except Exception as e:
#         return jsonify(error=str(e)), 400

if __name__ == "__main__":
    app.run(debug=True)