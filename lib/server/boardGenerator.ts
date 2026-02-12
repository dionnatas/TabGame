import { Property, Tile } from "@/types";

const LANDMARKS: Omit<Property, "id" | "ownerId" | "level">[] = [
  { name: "Cristo Redentor", country: "Brazil", value: 280, rent: 45 },
  { name: "Torre Eiffel", country: "France", value: 320, rent: 52 },
  { name: "Taj Mahal", country: "India", value: 260, rent: 42 },
  { name: "Grande Muralha da China", country: "China", value: 300, rent: 48 },
  { name: "Coliseu", country: "Italy", value: 310, rent: 50 },
  { name: "Machu Picchu", country: "Peru", value: 250, rent: 40 },
  { name: "Pirâmides de Gizé", country: "Egypt", value: 330, rent: 54 },
  { name: "Estátua da Liberdade", country: "USA", value: 270, rent: 43 },
  { name: "Sagrada Família", country: "Spain", value: 290, rent: 46 },
  { name: "Big Ben", country: "UK", value: 240, rent: 39 },
  { name: "Moai de Rapa Nui", country: "Chile", value: 220, rent: 36 },
  { name: "Burj Khalifa", country: "UAE", value: 360, rent: 58 },
  { name: "Angkor Wat", country: "Cambodia", value: 245, rent: 38 },
  { name: "Opera de Sydney", country: "Australia", value: 275, rent: 44 }
];

export function generateBoard() {
  const properties: Property[] = LANDMARKS.map((landmark, idx) => ({
    ...landmark,
    id: `property-${idx + 1}`,
    ownerId: null,
    level: 0
  }));

  const propertyIndexes = [1, 3, 6, 8, 11, 13, 16, 18, 21, 23, 26, 28, 31, 36];
  const luckIndexes = [2, 9, 19, 27, 34];
  const badLuckIndexes = [7, 14, 24, 32, 38];
  const specialIndexes = [5, 15, 25, 35];

  const board: Tile[] = Array.from({ length: 40 }, (_, index) => {
    if (propertyIndexes.includes(index)) {
      const propertyId = properties[propertyIndexes.indexOf(index)]?.id;
      const property = properties.find((item) => item.id === propertyId);
      return {
        id: `tile-${index}`,
        index,
        type: "property",
        propertyId,
        label: property ? `${property.name} (${property.country})` : "Property"
      };
    }

    if (luckIndexes.includes(index)) {
      return { id: `tile-${index}`, index, type: "luck", label: "Luck" };
    }

    if (badLuckIndexes.includes(index)) {
      return { id: `tile-${index}`, index, type: "bad_luck", label: "Bad Luck" };
    }

    if (specialIndexes.includes(index)) {
      return { id: `tile-${index}`, index, type: "special_event", label: "Special Event" };
    }

    return { id: `tile-${index}`, index, type: "neutral", label: index === 0 ? "Start" : "Neutral" };
  });

  return { board, properties };
}
