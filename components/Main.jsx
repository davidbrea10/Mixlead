import { FlatList } from "react-native";
import { AnimatedGameCard } from "./GameCard";

import { Screen } from "./Screen";

export function Main() {
  return (
    <Screen>
      (
      <FlatList
        renderItem={({ item, index }) => (
          <AnimatedGameCard game={item} index={index} />
        )}
      />
      )
    </Screen>
  );
}
