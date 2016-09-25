var weapons = {
    'SMG': {'name':'SMG', 'attributes':[], 'range':{'point': 3, 'short':10,'medium':20,'long':50, 'extreme': 100}, 'ROF': {"Single": 1, "Burst": 3, "Auto": 6}, 'damage': "1d10+1", "penetration": 0, 'damage_type': "none"},
    'Rifle': {'name':'Rifle', 'attributes':["One", "Two"], 'range':{'point': 3, 'short':25,'medium':60,'long':120, 'extreme': 200}, 'ROF': {"Single": 1, "Burst": 3, "Auto": 6}, 'damage': "1d10+3", "penetration": 0, 'damage_type': "explosive"}
};

var ranges = ['point Blank', 'short', 'medium', 'long'];
var modifiers = [30, 10, 0, -10, -30];
var activeshots = {};
var gmpid = "";

on("ready", function() {
    apicmd.on('shoot', 'helpers for shooting', '[OPTIONS] OBJECT',
        [['-s', '--shooter_id [SHOOTER_ID]', 'token id of shooter'],
            ['-t', '--target_id [TARGET_ID]', 'token id of target'],
            ['-w', '--weapon [WEAPON_NAME]', 'name of weapon'],
            ['-r', '--rof [RATE OF FIRE]', 'rate of fire'],
            ['-k', '--skill [Skill]', 'Skill of shooter'],
            ['-m', '--modifier [Skill]', 'modifiers to the shot'],
            ['-x', '--secret [secret?]', 'keep secret']],
        shoot);
    apicmd.on('setgm', 'helpers for shooting', '[OPTIONS] OBJECT',
        [['-p', '--password [password]', 'shhhh secret']],
        auth);
    apicmd.on('shootconfirm', 'Confirmed the shot', '[OPTIONS] OBJECT',
        [['-p', '--player_id [PLAYER_ID]', "Player id"],
            ['-x', '--secret [PLAYER_ID]', "keep secret"]],
        confirmed);
});

function auth(argv, msg){
    if(argv['opts']['password'] == "aliens"){
        gmpid = msg.playerid;
    }
}

function confirmed(argv, msg){
    log(argv);
    var playerid = argv['opts']['player_id'];
    if(msg.playerid != playerid && !isGM(msg.playerid)){
        return;
    }
    var shot = activeshots[playerid];
    log(shot);
    if(shot){
        var range_name = shot['range_name'];
        var weapon_name = shot["weaponName"];
        var range = shot['range'];
        var range_modifier = shot['range_modifier'];
        var ROF = shot['rof'];
        var numShots = weapons[weapon_name]['ROF'][ROF];
        var damage = weapons[weapon_name]['damage'];
        var shooter = shot['shootername'];
        var target = shot['target'];
        var command = "!power {{--emote|" + shooter + " attacks their target! --tokenid|" + shot['tokenid'] + " --format|atwill --name|" + weapon_name
            + " --leftsub|" + shot['leftsub'] +
            "--Attack:|[[ [XPND][$Atk] 1d100]] vs " + target;
        command += " --?? $Atk.total >= " + target + "?? Misses:| All shots missed.";
        target_test = target;
        var i = 0;
        command += " --?? $Atk.total >= 91 AND $Atk.total < 94?? JAM:| Jams if Unreliable.";
        command += " --?? $Atk.total >= 94 AND $Atk.total < 96?? JAM:| Jams if Unreliable, Semi-Auto or Full-Auto and not reliable.";
        command += " --?? $Atk.total >= 96 AND $Atk.total < 99?? JAM:| Jams if Unreliable, Semi-Auto, Full-Auto, or Standard and not reliable.";
        command += " --?? $Atk.total == 100 ?? JAM:| Your weapon Jammed no matter what.";
        while(target_test >= 0){
            command += " --?? $Atk.total <= " + target_test + " AND $Atk.total > " + (target_test - 10) +
                "?? Degrees:| " + (i + 1);
            target_test -= 10;
            i++;
        }
        var target_test = target;
        for(i = 0; i < numShots; i++){
            command += " --?? $Atk.total < " + target_test + "?? Hit" + (i+1) + ":|" + "[[ [XPND] [$dmg] " +
                damage + "]] Pen " + weapons[weapon_name]['penetration'];
            target_test -= 10;
            if(target_test < 0){
                break;
            }
        }
        var attributes = weapons[weapon_name]['attributes'];
        command += "--Weapon Attributes:|" + attributes.join();
        if(argv['opts']['secret'] == 'true'){
            command += " --whisper|gm";
        }
        command += "}}";
        log("Shot: " + command);
        sendChat("player|" + msg.playerid, command);
    }else{
        log("no shot");
    }
}

function shoot(argv, msg) {
    var shooter = getObj('graphic', argv['opts']['shooter_id']);
    var target = getObj('graphic', argv['opts']['target_id']);
    var weapon = weapons[argv['opts']['weapon']];
    var skill = parseInt(argv['opts']['skill']);
    var modifier = parseInt(argv['opts']['modifier']);
    var fire_rate_string = "";
    var single = weapon['ROF']['Single'];
    if(single == 0){
        single = "-";
    }
    var burst = weapon['ROF']['Burst'];
    if(burst == 0){
        burst = "-";
    }
    var auto = weapon['ROF']['Auto'];
    if(auto == 0){
        auto = "-";
    }
    fire_rate_string += single + '/';
    fire_rate_string += burst + '/';
    fire_rate_string += auto;
    var leftsub = "" + (weapon['range']['short'] * 2) + "m " + fire_rate_string + " " + weapon['damage_type'];
    if(!skill){
        sendChat("", "No skill given.");
    }
    var ROF = argv['opts']['rof'];
    var rofKeys = Object.keys(weapon['ROF']);
    log(rofKeys);
    if(rofKeys.indexOf(ROF) == -1){
        log('no key');
        sendChat("", "ROF is not valid for weapon");
        return;
    }
    log("second");
    var range = distance(shooter, target);
    var range_calc = getRange(weapon, range);
    if(range_calc[0] === "Out"){
        sendChat("", "Shot is out of range for weapon");
        return;
    }
    var range_name = range_calc[0];
    var range_modifier = range_calc[1];
    var id = msg.playerid;
    activeshots[id] = {'leftsub': leftsub, 'weaponName' : argv['opts']['weapon'], 'range' : range, 'range_name': range_name, 'range_modifier': range_modifier, 'rof': ROF, 'target': (skill + modifier + range_modifier), 'tokenid': argv['opts']['shooter_id'], 'shootername': shooter.get('name')};
    log(command);
    var fluff = "!power {{--format|atwill --name|" + weapon['name'] + " --Weapon:|" +
        weapon['name'] + " --Range:| " + range_name + " (+" + range_modifier + ")" + ", " + range + "m " +
        " --leftsub|" + leftsub +
        " --ROF:|" + ROF + " Ammo Used: " + weapon['ROF'][ROF] +
        " --Roll Target:|Skill: " + skill + ", Difficulty Modifier: " + modifier + ", Range Modifier:" + range_modifier + ", Total " + (modifier + skill + range_modifier) +
        " --Target:| " + target.get('name') + ".";
    var command = "";
    if(argv['opts']['secret'] == 'true'){
        fluff += " --whisper|gm";
        command += "/w gm ";
    }
    fluff += "}}";
    //{{--name|" + weapon['name'] + " " + range_name + "Modifier: " + range_modifier + "}}
    command += "[Confirm](!shootconfirm --player_id " + id + " --secret true)";
    var message = fluff + "\n" + command;
    sendChat("player|" + msg.playerid, message);
    // sendChat("player|" + msg.playerid, command);
}

function getRange(weapon, range){
    var weapon_ranges = weapon['range'];
    for(i = 0; i < ranges.length; i++){
        if(range < weapon_ranges[ranges[i]]){
            return [ranges[i], modifiers[i]];
        }
    }
    return ["Out", "Out"];
}

function distance(shooter, target){
    var gridSize = 70;

    var lDist = Math.abs(shooter.get("left")-target.get("left"))/gridSize;
    lDist = lDist * 2;
    var tDist = Math.abs(shooter.get("top")-target.get("top"))/gridSize;
    tDist = tDist * 2;
    var dist = 0;

    dist = Math.sqrt(lDist*lDist + tDist*tDist);
    dist = Math.floor(dist);

    return dist;
}