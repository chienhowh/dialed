import {
  getOriginLabel,
  getProcessLabel,
  getRoastLevelLabel,
} from "@/domain/coffee/bean-profile";

import type { Coffee } from "./types";

export function getCoffeeDisplayName(coffee: Coffee) {
  if (coffee.productName) {
    return coffee.productName;
  }

  return [getOriginLabel(coffee.beanProfile.originCountry), coffee.beanProfile.region]
    .filter(Boolean)
    .join(" ");
}

export function getBeanProfileSummary(coffee: Coffee) {
  return [
    getProcessLabel(coffee.beanProfile.process),
    coffee.beanProfile.variety,
    getRoastLevelLabel(coffee.beanProfile.roastLevel),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function getOriginSummary(coffee: Coffee) {
  return [getOriginLabel(coffee.beanProfile.originCountry), coffee.beanProfile.region]
    .filter(Boolean)
    .join(" · ");
}
