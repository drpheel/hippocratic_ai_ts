from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import engine
from flask_cors import CORS
import os
from flask import request
import random
import string
import logging


def get_db_url():
    db_name = os.environ.get('CLOUD_SQL_DATABASE_NAME')
    db_host = "db"
    pf = open("/run/secrets/db-password", 'r')
    password = pf.read().strip()
    pf.close()
    return engine.url.URL.create(
        "mysql+pymysql",
        username="root",
        password=password,
        host=db_host,
        database=db_name    
    )    

def generate_random_value(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


app = Flask(__name__)
db_url = get_db_url()
logging.info(f"DB URL: {db_url}")
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
CORS(app, supports_credentials=True, origins=["http://localhost:*"])
db = SQLAlchemy(app)

# Python
class PromptGroup(db.Model):
    __tablename__ = "PROMPT_GROUPS"
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text)
    group_size = db.Column(db.Integer)

class Prompt(db.Model):
    __tablename__ = "PROMPTS"
    id = db.Column(db.Integer, primary_key=True)
    prompt_group_id = db.Column(db.Integer, db.ForeignKey("PROMPT_GROUPS.id"), nullable=False)
    value = db.Column(db.Text)
    response = db.Column(db.Text)

class Battle(db.Model):
    __tablename__ = "BATTLE"
    id = db.Column(db.Integer, primary_key=True)
    prompt_1 = db.Column(db.Integer, db.ForeignKey("PROMPTS.id"), nullable=False)
    prompt_2 = db.Column(db.Integer, db.ForeignKey("PROMPTS.id"), nullable=False)
    winner = db.Column(db.Integer, db.ForeignKey("PROMPTS.id"))
    round = db.Column(db.Integer)
    next_match = db.Column(db.Integer, db.ForeignKey("BATTLE.id"))
    prompt_group_id = db.Column(db.Integer, db.ForeignKey("PROMPT_GROUPS.id"))
    prompt_group_index = db.Column(db.Integer)


@app.route("/test", methods=["GET"])
def test():
    return jsonify({"message": "Hello, World!"}, 200)

@app.route("/create_group", methods=["POST"])
def create_group():
    data = request.get_json()
    question = data.get("question")
    group_size = data.get("size")    
    if not question or group_size is None:
        return jsonify({"error": "Invalid input"}), 400
        
    try:
        group_size = int(group_size)
    except ValueError:
        return jsonify({"error": "Size must be an integer"}), 400

    new_group = PromptGroup(question=question, group_size=group_size)
    db.session.add(new_group)
    db.session.commit()



    for _ in range(group_size):
        random_value = generate_random_value()
        new_prompt = Prompt(prompt_group_id=new_group.id, value=random_value, response="")
        db.session.add(new_prompt)
    db.session.commit()

    prompts = Prompt.query.filter_by(prompt_group_id=new_group.id).all()
    result = [{"id": p.id, "value": p.value, "response": p.response, "prompt_group_id": p.prompt_group_id} for p in prompts]
    return jsonify(result), 200

@app.route("/update_prompts", methods=["POST"])
def update_prompts():
    data = request.get_json()  # expects a list of {"id":..., "value":..., "response":...}
    for item in data:
        prompt_id = item.get("id")
        new_value = item.get("value")

        existing_prompt = Prompt.query.get(prompt_id)
        if existing_prompt:
            existing_prompt.value = new_value
            existing_prompt.response = generate_random_value(5000)

    db.session.commit()
    battles = [];
    battle_index = 0
    current_round = 1
    current_battles = []

    match_to_coordinates = {}
    PADDING_OFFSET = 20
    TOP_OFFSET = 150

    logging.info(f"Data: {data}")
    group_id = data[0]['prompt_group_id']
    # Create first round
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            new_battle = Battle(prompt_1=data[i]['id'], prompt_2=data[i + 1]['id'], round=current_round, prompt_group_id=group_id, prompt_group_index=battle_index)
        else:
            new_battle = Battle(prompt_1=data[i]['id'], prompt_2=None, round=current_round, prompt_group_id=group_id, prompt_group_index=battle_index)
        db.session.add(new_battle)
        db.session.commit()
        battle_index += 1
        battle_blob = {
            "id": new_battle.id,
            "round": current_round,
            "teamA": data[i]['value'] if i < len(data) else "",
            "teamB": data[i + 1]['value'] if i + 1 < len(data) else "",
            "teamA_ID": data[i]['id'] if i < len(data) else None,
            "teamB_ID": data[i + 1]['id'] if i + 1 < len(data) else None,
            "winner": None,
            "nextBattleId": None,
            "Yposition": len(current_battles) * 140,
            "Xposition": 0
        }
        current_battles.append(battle_blob)
        match_to_coordinates[new_battle.id] = { 'x': PADDING_OFFSET, 'y': (len(current_battles) * 140) + TOP_OFFSET }

    battles.extend(current_battles)

    # Generate subsequent rounds
    while len(current_battles) > 1:
        current_round += 1
        next_battles = []
        logging.info(f"current battles {current_battles}")
        for i in range(0, len(current_battles), 2):
            if i + 1 < len(current_battles):
                y_pos = (
                    current_battles[i]["Yposition"]
                    + current_battles[i + 1]["Yposition"]
                ) / 2
            else:
                y_pos = current_battles[i]["Yposition"]
            new_battle = Battle(prompt_1=None, prompt_2=None, round=current_round, prompt_group_id=group_id, prompt_group_index=battle_index)
            db.session.add(new_battle)
            db.session.commit()
            battle_index += 1
            next_battle_blob = {
                "id": new_battle.id,
                "round": current_round,
                "teamA": "",
                "teamB": "",
                "teamA_ID": None,
                "teamB_ID": None,
                "winner": None,
                "nextBattleId": None,
                "Yposition": y_pos,
                "Xposition": (current_round - 1) * 200
            }
            match_to_coordinates[new_battle.id] = { 'x': next_battle_blob["Xposition"] + PADDING_OFFSET, 'y': next_battle_blob["Yposition"] }
            current_battles[i]["nextBattleId"] = new_battle.id
            logging.info(f"Current battle: {current_battles[i]}")
            parent_battle_a = Battle.query.filter_by(id=current_battles[i]["id"]).first()
            parent_battle_a.next_match = new_battle.id
            if i + 1 < len(current_battles):
                current_battles[i + 1]["nextBattleId"] = new_battle.id
                parent_battle_b = Battle.query.filter_by(id=current_battles[i + 1]["id"]).first()
                parent_battle_b.next_match = new_battle.id

            next_battles.append(next_battle_blob)

        battles.extend(next_battles)
        current_battles = next_battles

    db.session.commit()
    return jsonify({"message": "Prompts updated", 'battles': battles, 'matchToCoordinates': match_to_coordinates}), 200

@app.route("/get_battle", methods=["GET"])
def get_battle():
    battle_id = request.args.get("battle_id")
    if not battle_id:
        return jsonify({"error": "Missing battle_id"}), 400

    battle = Battle.query.get(battle_id)
    if not battle:
        return jsonify({"error": "Battle not found"}), 404

    prompt1 = Prompt.query.get(battle.prompt_1)
    prompt2 = Prompt.query.get(battle.prompt_2)

    return jsonify({
        "id": battle.id,
        "prompt1Value": prompt1.value if prompt1 else None,
        "prompt1Response": prompt1.response if prompt1 else None,
        "prompt2Value": prompt2.value if prompt2 else None,
        "prompt2Response": prompt2.response if prompt2 else None
    }), 200

@app.route("/update_battle_winner", methods=["POST"])
def update_battle_winner():
    data = request.get_json()
    battle_id = data.get("battle_id")
    winner_prompt_id = data.get("winner_prompt_id")
    if not battle_id or not winner_prompt_id:
        return jsonify({"error": "Missing parameters"}), 400
        
    battle = Battle.query.get(battle_id)
    if not battle:
        return jsonify({"error": "Battle not found"}), 404
        
    battle.winner = winner_prompt_id
    if battle.next_match:
        next_battle = Battle.query.get(battle.next_match)
        if (battle.prompt_group_index % 2) == 0:
            next_battle.prompt_1 = winner_prompt_id
        elif (battle.prompt_group_index % 2) == 1:
            next_battle.prompt_2 = winner_prompt_id
    db.session.commit()
    return jsonify({"message": "Battle winner updated"}), 200

if __name__ == "__main__":
    logging.info("Starting the server")
    app.run(host='0.0.0.0', debug=True)