export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:00`;
  }
};

export const formatDurationLong = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    const hourText = hours === 1 ? "hour" : "hours";
    const minuteText = minutes === 1 ? "minute" : "minutes";
    return `${hours} ${hourText} ${minutes.toString().padStart(2, '0')} ${minuteText}`;
  } else {
    const minuteText = minutes === 1 ? "minute" : "minutes";
    return `${minutes} ${minuteText}`;
  }
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatHoursDecimal = (milliseconds: number): number => {
  return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
};

export const calculateHourlyRate = (
	totalDuration: number,
	rate: number
): number => {
	const hours = formatHoursDecimal(totalDuration);
	return Math.round(hours * rate * 100) / 100;
};

/**
 * Generates a readable summary paragraph from task descriptions
 * @param descriptions - Array of task descriptions
 * @returns A formatted paragraph combining all descriptions
 */
export const generateDailySummary = (descriptions: string[]): string => {
	// Filter out empty or whitespace-only descriptions
	const validDescriptions = descriptions
		.filter((desc) => desc && desc.trim().length > 0)
		.map((desc) => desc.trim());

	if (validDescriptions.length === 0) {
		return "";
	}

	// Connectors to use between sentences (not used for first sentence)
	const connectors = ["Additionally,", "Also,", "Furthermore,", "Moreover,"];

	// Format each description into a proper sentence
	const formattedSentences = validDescriptions.map((desc, index) => {
		// Capitalize first letter
		let sentence = desc.charAt(0).toUpperCase() + desc.slice(1);

		// Add period at the end if missing punctuation
		const lastChar = sentence.charAt(sentence.length - 1);
		if (![".", "!", "?"].includes(lastChar)) {
			sentence += ".";
		}

		// Add connector for sentences after the first one (vary the connectors)
		if (index > 0 && index < validDescriptions.length) {
			const connectorIndex = (index - 1) % connectors.length;
			sentence = `${connectors[connectorIndex]} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
		}

		return sentence;
	});

	// Join all sentences with a space
	return formattedSentences.join(" ");
};
