import Section from '../../classModels/Section';


interface UseSectionPanelDetailReturn {
  getSeatsClass: () => string;
}


export default function useSectionPanelDetail(section: Section): UseSectionPanelDetailReturn {
  const getSeatsClass = () => {
    const seatingPercentage = section.seatsRemaining / section.seatsCapacity
    if (seatingPercentage > (2 / 3)) {
      return 'green'
    } if (seatingPercentage > (1 / 3)) {
      return 'yellow'
    }
    return 'red'
  }

  return {
    getSeatsClass: getSeatsClass,
  }
}
