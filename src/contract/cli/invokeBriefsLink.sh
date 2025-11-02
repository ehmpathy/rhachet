REPO=rhachet-roles-ehmpathy
ROLE=mechanic

mkdir -p .briefs/$ROLE
for f in node_modules/$REPO/dist/logic/roles/$ROLE/.briefs/*; do
  ln -s "../../$f" ".briefs/$ROLE/$(basename "$f")"
done
