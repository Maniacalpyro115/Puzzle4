import csv
import argparse
import os
from datetime import datetime
import requests


BASE_URL = "https://www.bungie.net/Platform"

API_KEY = os.getenv("BUNGIE_API_KEY", "")

RAID_MODE = 4
CHARACTERS_COMPONENT = 200


class BungieApiError(Exception):
    pass


def bungie_get(path, params=None):
    url = f"{BASE_URL}{path}"

    response = requests.get(
        url,
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        params=params,
        timeout=30,
    )

    try:
        data = response.json()
    except Exception:
        data = None

    if not response.ok:
        print("\nBungie HTTP error")
        print("Method: GET")
        print("URL:", url)
        print("Status:", response.status_code)
        print("Body:", data if data is not None else response.text[:1000])
        response.raise_for_status()

    if data.get("ErrorCode") != 1:
        raise BungieApiError(
            f"{data.get('ErrorStatus')}: {data.get('Message')}"
        )

    return data["Response"]


def bungie_post(path, json_body=None):
    url = f"{BASE_URL}{path}"

    response = requests.post(
        url,
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json=json_body or {},
        timeout=30,
    )

    try:
        data = response.json()
    except Exception:
        data = None

    if not response.ok:
        print("\nBungie HTTP error")
        print("Method: POST")
        print("URL:", url)
        print("Status:", response.status_code)
        print("Request body:", json_body)
        print("Response body:", data if data is not None else response.text[:1000])
        response.raise_for_status()

    if data.get("ErrorCode") != 1:
        raise BungieApiError(
            f"{data.get('ErrorStatus')}: {data.get('Message')}"
        )

    return data["Response"]


def parse_bungie_name(bungie_name):
    if "#" not in bungie_name:
        raise ValueError("Bungie name must look like PlayerName#1234")

    display_name, code = bungie_name.rsplit("#", 1)

    if not display_name.strip():
        raise ValueError("Missing display name before #")

    if not code.isdigit():
        raise ValueError("The part after # must be numeric, like Pyro#0222")

    return display_name.strip(), int(code)


def find_player_by_global_name(display_name, display_name_code, max_pages=10):
    for page in range(max_pages):
        response = bungie_post(
            f"/User/Search/GlobalName/{page}/",
            {"displayNamePrefix": display_name},
        )

        results = response.get("searchResults", [])

        for result in results:
            if (
                result.get("bungieGlobalDisplayName", "").casefold()
                != display_name.casefold()
                or result.get("bungieGlobalDisplayNameCode") != display_name_code
            ):
                continue

            memberships = result.get("destinyMemberships", [])
            if not memberships:
                raise BungieApiError(
                    f"Found {display_name}#{display_name_code:04d}, "
                    "but it has no public Destiny memberships."
                )

            active_membership = next(
                (
                    membership
                    for membership in memberships
                    if membership.get("crossSaveOverride")
                    and membership.get("crossSaveOverride")
                    == membership.get("membershipType")
                ),
                memberships[0],
            )

            return {
                "membership_type": active_membership["membershipType"],
                "membership_id": active_membership["membershipId"],
                "display_name": result.get(
                    "bungieGlobalDisplayName",
                    display_name,
                ),
                "display_code": result.get(
                    "bungieGlobalDisplayNameCode",
                    display_name_code,
                ),
            }

        if not response.get("hasMore"):
            break

    raise BungieApiError(f"No player found for {display_name}#{display_name_code:04d}")


def find_player(bungie_name):
    display_name, display_name_code = parse_bungie_name(bungie_name)
    return find_player_by_global_name(display_name, display_name_code)


def get_character_ids(membership_type, membership_id):
    profile = bungie_get(
        f"/Destiny2/{membership_type}/Profile/{membership_id}/",
        params={"components": CHARACTERS_COMPONENT},
    )

    characters = profile.get("characters", {}).get("data", {})

    if not characters:
        raise BungieApiError("No Destiny 2 characters found for this player.")

    return list(characters.keys())


def get_stat_value(activity, stat_name, default=0):
    return (
        activity
        .get("values", {})
        .get(stat_name, {})
        .get("basic", {})
        .get("value", default)
    )


def get_raid_history_for_character(
    membership_type,
    membership_id,
    character_id,
    max_pages=10,
    count=250,
):
    raids = []

    for page in range(max_pages):
        response = bungie_get(
            f"/Destiny2/{membership_type}/Account/{membership_id}"
            f"/Character/{character_id}/Stats/Activities/",
            params={
                "mode": RAID_MODE,
                "page": page,
                "count": count,
            },
        )

        activities = response.get("activities", [])

        if not activities:
            break

        for activity in activities:
            details = activity.get("activityDetails", {})

            duration_seconds = get_stat_value(
                activity,
                "activityDurationSeconds",
                0,
            )

            raids.append(
                {
                    "period": activity.get("period"),
                    "character_id": character_id,
                    "activity_hash": details.get("directorActivityHash"),
                    "reference_id": details.get("referenceId"),
                    "instance_id": details.get("instanceId"),
                    "completed": int(get_stat_value(activity, "completed", 0) or 0),
                    "kills": int(get_stat_value(activity, "kills", 0) or 0),
                    "deaths": int(get_stat_value(activity, "deaths", 0) or 0),
                    "assists": int(get_stat_value(activity, "assists", 0) or 0),
                    "duration_minutes": round((duration_seconds or 0) / 60, 1),
                }
            )

        if len(activities) < count:
            break

    return raids


def pull_all_raid_history(bungie_name, max_pages=10):
    player = find_player(bungie_name)

    membership_type = player["membership_type"]
    membership_id = player["membership_id"]

    character_ids = get_character_ids(
        membership_type,
        membership_id,
    )

    all_raids = []

    for character_id in character_ids:
        print(f"Pulling raids for character {character_id}...")

        character_raids = get_raid_history_for_character(
            membership_type,
            membership_id,
            character_id,
            max_pages=max_pages,
        )

        all_raids.extend(character_raids)

    all_raids.sort(key=lambda x: x["period"] or "", reverse=True)

    return player, all_raids


def format_period(period):
    if not period:
        return ""

    try:
        return datetime.fromisoformat(
            period.replace("Z", "+00:00")
        ).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return period


def print_table(player, raids, limit=None):
    display = (
        f'{player["display_name"]}#{player["display_code"]:04d}'
        if player["display_code"] != ""
        else player["display_name"]
    )

    total_completed = sum(r["completed"] for r in raids)

    print(f"\nRaid history for {display}")
    print(f"Total raid activities pulled: {len(raids)}")
    print(f"Completed clears in pulled history: {total_completed}\n")

    rows = raids[:limit] if limit else raids

    print(
        f"{'Date':<18} "
        f"{'Done':<5} "
        f"{'Kills':<7} "
        f"{'Deaths':<7} "
        f"{'Min':<7} "
        f"{'ActivityHash':<14} "
        f"{'InstanceId'}"
    )
    print("-" * 105)

    for r in rows:
        print(
            f"{format_period(r['period']):<18} "
            f"{r['completed']:<5} "
            f"{r['kills']:<7} "
            f"{r['deaths']:<7} "
            f"{r['duration_minutes']:<7} "
            f"{str(r['activity_hash']):<14} "
            f"{r['instance_id']}"
        )


def save_csv(path, raids):
    fieldnames = [
        "period",
        "character_id",
        "activity_hash",
        "reference_id",
        "instance_id",
        "completed",
        "kills",
        "deaths",
        "assists",
        "duration_minutes",
    ]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for raid in raids:
            writer.writerow(raid)


def main():
    parser = argparse.ArgumentParser(
        description="Pull a Destiny 2 player's raid history from Bungie."
    )

    parser.add_argument(
        "bungie_name",
        help='Bungie name, e.g. "Pyro#0222"',
    )

    parser.add_argument(
        "--max-pages",
        type=int,
        default=10,
        help="Max pages of history to pull per character.",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Number of rows to display. Use 0 to show all.",
    )

    parser.add_argument(
        "--csv",
        help="Optional CSV output path, e.g. raids.csv",
    )

    args = parser.parse_args()

    if not API_KEY:
        raise ValueError("Set the BUNGIE_API_KEY environment variable first.")

    try:
        player, raids = pull_all_raid_history(
            args.bungie_name,
            max_pages=args.max_pages,
        )

        limit = None if args.limit == 0 else args.limit

        print_table(player, raids, limit=limit)

        if args.csv:
            save_csv(args.csv, raids)
            print(f"\nSaved CSV to {args.csv}")

    except requests.exceptions.HTTPError:
        print("\nHTTP failure while calling Bungie.")
        print("Common causes:")
        print("- Bungie API is temporarily failing")
        print("- Bad API key")
        print("- Player lookup endpoint rejected the request")
        raise

    except BungieApiError as e:
        print("\nBungie API error:")
        print(e)
        raise


if __name__ == "__main__":
    main()
